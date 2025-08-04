const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult, check } = require('express-validator');
const qrcode = require('qrcode');
const sharp = require('sharp');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { log } = require("console");

const app = express();
const PORT = process.env.PORT || 3000;

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware Setup
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": ["'self'", "cdn.jsdelivr.net"],
                "img-src": ["'self'", "data:", "res.cloudinary.com"],
            },
        },
    })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- RATE LIMITING MIDDLEWARE ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 authentication attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
});

// Apply limiters to specific routes
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/', apiLimiter); // Apply general limiter to all other API routes

// --- MULTER-CLOUDINARY CONFIGURATION ---
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'event-flyers', // Optional folder name in Cloudinary
        format: async (req, file) => 'webp', // Format to webp
        transformation: [
            { quality: "auto:good" }, // Optimize image quality
        ],
    },
});

const upload = multer({
    storage: cloudinaryStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// MongoDB Connection
mongoose.connect(process.env.DB_CONNECTION_STRING)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch(err => console.error('Connection error', err));

// --- SCHEMAS AND MODELS ---

const submissionSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    businessName: { type: String, default: '' },
    eventName: { type: String, required: true },
    eventDescription: { type: String, default: 'No description provided.' },
    eventDate: { type: Date, required: true },
    eventTime: { type: String, required: true },
    eventLocation: { type: String, required: true },
    phone: { type: String, default: '' },
    ticketCount: { type: Number, required: true, min: 0 },
    flyerImagePath: { type: String, default: null },
    flyerImageThumbnailPath: { type: String, default: null }, // Still storing these for a low-res image
    flyerImagePlaceholderPath: { type: String, default: null }, // Still storing these for a low-res image
    tickets: [{
        type: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        includes: { type: String, default: '' }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        default: 'pending'
    },
    submittedAt: { type: Date, default: Date.now },
    ticketsSold: { type: Number, default: 0 }
});
const Submission = mongoose.model('Submission', submissionSchema);

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
});
const User = mongoose.model('User', userSchema);

const ticketSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ticketType: { type: String, required: true },
    price: { type: Number, required: true },
    purchaseDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'refunded'], default: 'active' },
    customerFirstName: { type: String, required: true },
    customerLastName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    isCheckedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// --- MAILERSEND CONFIGURATION ---
const mailerSend = new MailerSend({
apiKey: process.env.MAILERSEND_API_KEY,
});

function formatTimeServer(timeString) {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    let hourInt = parseInt(hour, 10);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    hourInt = hourInt % 12 || 12;
    return `${hourInt}:${minute} ${ampm}`;
}

// --- MIDDLEWARE ---

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Authentication token required.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT verification error:", err.message);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
}

async function isAdmin(req, res, next) {
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found in token.' });
    }
    try {
        const user = await User.findById(req.user.userId);
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden: Admins only.' });
        }
    } catch (error) {
        console.error("Error during admin check:", error);
        res.status(500).json({ message: 'Server error during admin role verification.' });
    }
}

// --- API ROUTES ---

// CHECK-IN ROUTES
app.get('/api/events/my-events', authenticateToken, isAdmin, async (req, res) => {
    try {
        const manageableEvents = await Submission.find({ status: 'approved' }).sort({ eventDate: 1 });
        res.status(200).json(manageableEvents);
    } catch (err) {
        console.error("Error fetching manageable events:", err);
        res.status(500).json({ message: 'Failed to fetch events for check-in.' });
    }
});

app.get('/api/checkin/stats/:eventId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { eventId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid Event ID format.' });
        }
        const event = await Submission.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        const checkedInCount = await Ticket.countDocuments({ eventId: eventId, isCheckedIn: true });
        res.status(200).json({
            eventName: event.eventName,
            totalTickets: event.ticketsSold,
            checkedInCount: checkedInCount
        });
    } catch (err) {
        console.error("Error fetching check-in stats:", err);
        res.status(500).json({ message: 'Failed to fetch event statistics.' });
    }
});

app.post('/api/tickets/checkin', authenticateToken, isAdmin, [
    body('ticketId').isMongoId().withMessage('Valid Ticket ID is required.'),
    body('eventId').isMongoId().withMessage('Valid Event ID is required.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    }
    const { ticketId, eventId } = req.body;
    const staffUserId = req.user.userId;
    try {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: 'Invalid Ticket: Not found in the system.' });
        }
        if (ticket.eventId.toString() !== eventId) {
            return res.status(400).json({ message: 'Ticket Mismatch: This ticket is not for the selected event.' });
        }
        if (ticket.isCheckedIn) {
            const checkedInDate = new Date(ticket.checkedInAt).toLocaleString('en-US', { timeZone: 'America/New_York' });
            return res.status(409).json({ message: `Already Redeemed: Ticket was checked in on ${checkedInDate}.` });
        }
        ticket.isCheckedIn = true;
        ticket.checkedInAt = new Date();
        ticket.checkedInBy = staffUserId;
        await ticket.save();
        res.status(200).json({ message: 'Access Granted: Check-in Successful' });
    } catch (err) {
        console.error("Error during ticket check-in:", err);
        res.status(500).json({ message: 'A server error occurred during check-in.' });
    }
});

// SALES & REFUND ROUTES
app.get('/api/sales', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { search, eventId } = req.query;
        let query = {};

        // Find all active event IDs first. 'Active' now means in the future, or within the last 24 hours.
        const cutoffDate = new Date(Date.now() - (24 * 60 * 60 * 1000));
        const activeEvents = await Submission.find({ eventDate: { $gte: cutoffDate } }).select('_id');
        const activeEventIds = activeEvents.map(event => event._id);

        // Filter sales by active event IDs
        query.eventId = { $in: activeEventIds };

        if (eventId) {
            // If the user is filtering by a specific event, check if it's active
            if (activeEventIds.some(id => id.toString() === eventId)) {
                query.eventId = eventId;
            } else {
                // If the selected event is no longer active, return an empty array
                return res.status(200).json([]);
            }
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { _id: mongoose.Types.ObjectId.isValid(search) ? new mongoose.Types.ObjectId(search) : null },
                { customerFirstName: searchRegex },
                { customerLastName: searchRegex },
                { customerEmail: searchRegex }
            ].filter(cond => cond._id !== null || !cond.hasOwnProperty('_id'));
        }

        const sales = await Ticket.find(query)
            .populate('eventId', 'eventName')
            .populate('userId', 'firstName lastName email')
            .sort({ purchaseDate: -1 });

        res.status(200).json(sales);
    } catch (error) {
        console.error("Error fetching sales data:", error);
        res.status(500).json({ message: "Failed to fetch sales data." });
    }
});

app.post('/api/tickets/:ticketId/resend', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findById(ticketId).populate('eventId').populate('userId', 'email');

        if (!ticket || !ticket.eventId) {
            return res.status(404).json({ message: 'Ticket or associated event not found.' });
        }

        const recipientEmail = ticket.customerEmail || (ticket.userId ? ticket.userId.email : null);

        if (!recipientEmail) {
            return res.status(400).json({ message: 'Could not find a recipient email for this ticket.' });
        }

        const qrCodeDataUrl = await qrcode.toDataURL(ticket._id.toString(), { width: 150, margin: 2 });
        const formattedTime = formatTimeServer(ticket.eventId.eventTime);
        const formattedDate = new Date(ticket.eventId.eventDate).toLocaleDateString();

        let ticketHtml = `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; background-color: #ffffff; color: #333; font-family: sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <p style="margin: 0 0 5px 0; font-size: 1.1em;"><strong>Event:</strong> ${ticket.eventId.eventName}</p>
                <p style="margin: 0 0 5px 0;"><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p>
                <p style="margin: 0 0 5px 0;"><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
                <p style="margin: 0 0 10px 0;"><strong>Ticket ID:</strong> ${ticket._id}</p>
                <p style="margin: 0 0 5px 0; text-align: center;"><strong>QR Code:</strong></p>
                <img src="${qrCodeDataUrl}" alt="QR Code" style="display: block; margin: 0 auto; max-width: 150px; border: 1px solid #ddd; padding: 5px; background-color: #ffffff;">
            </div>`;

        let emailHtmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
                <h2>Your Ticket from Click eTickets (Resent)</h2>
                <p>Hello ${ticket.customerFirstName},</p>
                <p>As requested, here is your ticket information again. Please present this at the event.</p>
                ${ticketHtml}
                <p>Best regards,<br>The Click eTickets Team</p>
            </div>
        `;

        const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, "Click eTickets");
        const recipient = new Recipient(recipientEmail);
        const emailParams = new EmailParams();
        emailParams.setFrom(sender);
        emailParams.setTo([recipient]);
        emailParams.setSubject(`Your Ticket for ${ticket.eventId.eventName} (Resent)`);
        emailParams.setHtml(emailHtmlContent);

        await mailerSend.email.send(emailParams);

        res.status(200).json({ message: `Ticket successfully resent to ${recipientEmail}` });
    } catch (error) {
        console.error("Error resending ticket:", error);
        res.status(500).json({ message: "Failed to resend ticket." });
    }
});

app.post('/api/refunds/:ticketId', authenticateToken, isAdmin, async (req, res) => {
    const { ticketId } = req.params;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const ticket = await Ticket.findById(ticketId).session(session);

        if (!ticket) {
            throw new Error('Ticket not found.');
        }
        if (ticket.status === 'refunded') {
            throw new Error('This ticket has already been refunded.');
        }

        const refundAmount = (ticket.price / 1.05).toFixed(2);
        console.log(`--- SIMULATING REFUND for ticket ID: ${ticketId} for the amount of $${refundAmount} ---`);

        ticket.status = 'refunded';
        await ticket.save({ session });

        await Submission.findByIdAndUpdate(ticket.eventId, { $inc: { ticketsSold: -1 } }, { session });

        await session.commitTransaction();
        res.status(200).json({ message: `Ticket successfully refunded for $${refundAmount}.`, ticket });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error processing refund:", error);
        res.status(500).json({ message: error.message || "Failed to process refund." });
    } finally {
        session.endSession();
    }
});

app.post('/api/refunds/event/:eventId', authenticateToken, isAdmin, async (req, res) => {
    const { eventId } = req.params;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const event = await Submission.findById(eventId).session(session);
        if (!event) {
            throw new Error('Event not found.');
        }

        const activeTickets = await Ticket.find({ eventId: eventId, status: 'active' }).session(session);

        if (activeTickets.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'No active tickets found for this event to refund.' });
        }

        console.log(`--- SIMULATING BULK REFUND for ${activeTickets.length} tickets in event: ${eventId} ---`);
        for (const ticket of activeTickets) {
            const refundAmount = (ticket.price / 1.05).toFixed(2);
            console.log(`- Refunding Ticket ID ${ticket._id} for amount $${refundAmount}`);
        }

        const ticketIdsToRefund = activeTickets.map(t => t._id);
        await Ticket.updateMany(
            { _id: { $in: ticketIdsToRefund } },
            { $set: { status: 'refunded' } },
            { session }
        );

        event.ticketsSold = 0;
        await event.save({ session });

        await session.commitTransaction();
        res.status(200).json({ message: `Successfully refunded ${activeTickets.length} tickets for the event "${event.eventName}".` });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error processing event refund:", error);
        res.status(500).json({ message: error.message || "Failed to process event refund." });
    } finally {
        session.endSession();
    }
});


// SUBMISSION & EVENT ROUTES
app.post('/api/submit', upload.single('flyer'), [
    body('eventName').notEmpty().withMessage('Event name is required.'),
    body('eventDescription').notEmpty().withMessage('Event description is required.'),
    body('eventDate').isISO8601().toDate().withMessage('Valid event date is required.'),
    body('eventTime').notEmpty().withMessage('Event time is required.'),
    body('eventLocation').notEmpty().withMessage('Event location is required.'),
    body('ticketCount').isInt({ min: 0 }).withMessage('Ticket count must be a non-negative integer.'),
    check('ticket_type').isArray({ min: 1 }).withMessage('At least one ticket type is required.'),
    check('ticket_type.*').notEmpty().withMessage('Ticket type label cannot be empty.'),
    check('ticket_price.*').isFloat({ min: 0 }).withMessage('Ticket price must be a non-negative number.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Since we've replaced the sharp logic, we might need to handle a file that was uploaded to Cloudinary but failed validation
        // In this case, we can't easily delete it from Cloudinary without the public_id, which we don't have yet.
        // It's a small edge case, and a background cleanup task could be set up later if this becomes an issue.
        return res.status(400).json({ errors: errors.array().map(e => e.msg).join(', ') });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'Event flyer is required.' });
    }

    try {
        const imagePath = req.file.path; // This is the URL from Cloudinary
        const thumbnailPath = cloudinary.url(req.file.filename, { width: 800, crop: "scale", format: 'webp', quality: 60 });
        const placeholderPath = cloudinary.url(req.file.filename, { width: 20, crop: "scale", format: 'webp', quality: 50, effect: "blur:3000" });

        const ticketData = req.body.ticket_type.map((type, index) => ({
            type: type,
            price: parseFloat(req.body.ticket_price[index]) || 0,
            includes: req.body.ticket_includes[index] || ''
        }));

        const newSubmission = new Submission({
            ...req.body,
            flyerImagePath: imagePath,
            flyerImageThumbnailPath: thumbnailPath,
            flyerImagePlaceholderPath: placeholderPath,
            tickets: ticketData,
            status: 'pending'
        });

        await newSubmission.save();
        res.status(200).json({ message: 'Submission received successfully!' });

    } catch (err) {
        console.error("Error processing submission:", err);
        // We might want to add a Cloudinary deletion here, but it's complex without the public_id from the initial upload.
        // The current Multer-Cloudinary setup doesn't give us the public_id easily in a single request.
        // This is a known limitation with this specific library, but for a live application, it's better than leaving files on the server.
        res.status(500).json({ error: 'Failed to process submission.' });
    }
});

app.get('/api/submissions', authenticateToken, isAdmin, async (req, res) => {
    try {
        const submissions = await Submission.find({}).sort({ submittedAt: -1 });
        res.status(200).json(submissions);
    } catch (err) {
        console.error("Error fetching submissions:", err);
        res.status(500).json({ error: 'Failed to fetch submissions.' });
    }
});

app.get('/api/events', async (req, res) => {
    try {
        const approvedEvents = await Submission.find({ status: 'approved' }).sort({ eventDate: 1 });
        res.status(200).json(approvedEvents);
    } catch (err) {
        console.error("Error fetching public events:", err);
        res.status(500).json({ error: 'Failed to fetch events.' });
    }
});

app.get('/api/events/:id', async (req, res) => {
    try {
        const event = await Submission.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found.' });
        res.status(200).json(event);
    } catch (err) {
        console.error("Error fetching single event:", err);
        res.status(500).json({ message: 'Failed to fetch event details.' });
    }
});

app.patch('/api/submissions/:id/status', authenticateToken, isAdmin, [
    body('status').isIn(['approved', 'denied']).withMessage('Invalid status provided.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array().map(e => e.msg).join(', ') });
    try {
        const updatedSubmission = await Submission.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );
        if (!updatedSubmission) return res.status(404).json({ message: 'Submission not found.' });
        res.status(200).json(updatedSubmission);
    } catch (err) {
        console.error("Error updating submission status:", err);
        res.status(500).json({ message: 'Failed to update submission status.' });
    }
});

app.put('/api/submissions/:id', authenticateToken, isAdmin, upload.single('flyer'), [
    body('eventName').notEmpty().withMessage('Event name is required.'),
    body('eventDescription').notEmpty().withMessage('Event description is required.'),
    body('eventDate').isISO8601().toDate().withMessage('Valid event date is required.'),
    body('eventLocation').notEmpty().withMessage('Event location is required.'),
    body('eventTime').notEmpty().withMessage('Event time is required.'),
    body('ticketCount').isInt({ min: 0 }).withMessage('Ticket count must be a non-negative integer.'),
    check('tickets.*.type').notEmpty().withMessage('Ticket type label cannot be empty.'),
    check('tickets.*.price').isFloat({ min: 0 }).withMessage('Ticket price must be a non-negative number.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array().map(e => e.msg).join(', ') });
    }

    try {
        const existingEvent = await Submission.findById(req.params.id);
        if (!existingEvent) return res.status(404).json({ message: 'Event not found.' });

        // This line correctly copies all fields, including the 'tickets' array.
        let updateData = { ...req.body };

        // Handle new flyer upload
        if (req.file) {
            if (existingEvent.flyerImagePath) {
                const publicId = existingEvent.flyerImagePath.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`event-flyers/${publicId}`);
            }
            const imagePath = req.file.path;
            const thumbnailPath = cloudinary.url(req.file.filename, { width: 800, crop: "scale", format: 'webp', quality: 60 });
            const placeholderPath = cloudinary.url(req.file.filename, { width: 20, crop: "scale", format: 'webp', quality: 50, effect: "blur:3000" });
            updateData.flyerImagePath = imagePath;
            updateData.flyerImageThumbnailPath = thumbnailPath;
            updateData.flyerImagePlaceholderPath = placeholderPath;
        }

        // The manual 'while' loop has been removed because it is not needed.
        // 'updateData' already has the correct 'tickets' array from req.body.

        const updatedEvent = await Submission.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        res.status(200).json({ message: 'Event updated successfully.', event: updatedEvent });

    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event.' });
    }
});

app.delete('/api/submissions/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const deletedEvent = await Submission.findByIdAndDelete(req.params.id);
        if (!deletedEvent) return res.status(404).json({ message: 'Event not found.' });

        // Delete images from Cloudinary
        if (deletedEvent.flyerImagePath) {
            const publicId = deletedEvent.flyerImagePath.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`event-flyers/${publicId}`);
        }

        res.status(200).json({ message: 'Event deleted successfully.' });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: 'Failed to delete event.' });
    }
});

// TICKET PURCHASE ROUTE
app.post('/api/purchase-tickets', [
    body('purchases').isArray({ min: 1 }).withMessage('Purchase data is missing or empty.'),
    body('customerInfo.email').isEmail().withMessage('Valid customer email is required.'),
    body('customerInfo.firstName').notEmpty().withMessage('Customer first name is required.'),
    body('customerInfo.lastName').notEmpty().withMessage('Customer last name is required.'),
    body('customerInfo.phone').notEmpty().withMessage('Customer phone is required.'),
    check('purchases.*.eventId').isMongoId().withMessage('Invalid Event ID for a purchase item.'),
    check('purchases.*.selectedTickets').isArray({ min: 1 }).withMessage('Each purchase item must have selected tickets.'),
    check('purchases.*.selectedTickets.*.ticketType').notEmpty().withMessage('Ticket type name cannot be empty.'),
    check('purchases.*.selectedTickets.*.quantity').isInt({ min: 1 }).withMessage('Ticket quantity must be a positive integer.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    }
    const { purchases, customerInfo } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch (err) {
            console.warn('Invalid token on purchase, proceeding as guest:', err.message);
        }
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        let allTicketsForDb = [];
        let allTicketsForEmail = [];
        for (const purchaseItem of purchases) {
            const event = await Submission.findById(purchaseItem.eventId).session(session);
            if (!event || event.status !== 'approved') {
                throw new Error(`Event "${purchaseItem.eventId}" not found or not available for purchase.`);
            }
            let totalTicketsRequestedForEvent = 0;
            for (const st of purchaseItem.selectedTickets) {
                const ticketOption = event.tickets.find(t => t.type === st.ticketType);
                if (!ticketOption) {
                    throw new Error(`Ticket type "${st.ticketType}" not found for event "${event.eventName}".`);
                }
                if (st.quantity <= 0) {
                    throw new Error(`Quantity for ticket type "${st.ticketType}" must be positive.`);
                }
                totalTicketsRequestedForEvent += st.quantity;
                for (let i = 0; i < st.quantity; i++) {
                    const ticketObj = {
                        eventId: event._id,
                        userId: userId,
                        ticketType: st.ticketType,
                        price: ticketOption.price,
                        customerFirstName: customerInfo.firstName,
                        customerLastName: customerInfo.lastName,
                        customerEmail: customerInfo.email,
                        purchaseDate: new Date()
                    };
                    allTicketsForDb.push(ticketObj);
                    const ticketForEmail = { eventName: event.eventName, eventDate: event.eventDate, eventTime: event.eventTime, ticketType: st.ticketType, price: ticketOption.price };
                    allTicketsForEmail.push(ticketForEmail);
                }
            }
            if (event.ticketCount !== null && event.ticketsSold + totalTicketsRequestedForEvent > event.ticketCount) {
                throw new Error(`Not enough tickets available for "${event.eventName}". Remaining: ${event.ticketCount - event.ticketsSold}.`);
            }
            event.ticketsSold += totalTicketsRequestedForEvent;
            await event.save({ session });
        }
        let savedTicketDocs = [];
        if (allTicketsForDb.length > 0) {
            savedTicketDocs = await Ticket.insertMany(allTicketsForDb, { session });
        }
        const finalTicketsForEmail = allTicketsForEmail.map((ticketObj, index) => ({
            ...ticketObj,
            ticketId: savedTicketDocs[index]._id.toString()
        }));
        await session.commitTransaction();
        session.endSession();
        let emailHtmlContent;
        if (userId === null) {
            let guestTicketsHtml = '<h3>Your Tickets:</h3>';
            for (const ticket of finalTicketsForEmail) {
                const qrCodeDataUrl = await qrcode.toDataURL(ticket.ticketId, { width: 150, margin: 2 });
                const formattedTime = formatTimeServer(ticket.eventTime);
                const formattedDate = new Date(ticket.eventDate).toLocaleDateString();
                guestTicketsHtml += `
                    <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; background-color: #ffffff; color: #333; font-family: sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <p style="margin: 0 0 5px 0; font-size: 1.1em;"><strong>Event:</strong> ${ticket.eventName}</p>
                        <p style="margin: 0 0 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                        <p style="margin: 0 0 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                        <p style="margin: 0 0 5px 0;"><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                        <p style="margin: 0 0 5px 0; text-align: center;"><strong>QR Code:</strong></p>
                        <img src="${qrCodeDataUrl}" alt="QR Code for Ticket ${ticket.ticketId}" style="display: block; margin: 0 auto; max-width: 150px; border: 1px solid #ddd; padding: 5px; background-color: #ffffff;">
                        <small style="display: block; text-align: center; margin-top: 10px; color: #555;">Show this QR code at the event entrance for scanning.</small>
                    </div>
                `;
            }
            emailHtmlContent = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #fff;">
                    <h2 style="color: #4a00e0; text-align: center;">Your Click eTickets Purchase Confirmation</h2>
                    <p>Hello ${customerInfo.firstName || 'Valued Customer'},</p>
                    <p>Thank you for your purchase! Here are the details of your tickets. Please keep this email safe as your QR codes are included below:</p>
                    ${guestTicketsHtml}
                    <p>For any questions or support, please don't hesitate to contact us.</p>
                    <p>Best regards,<br>The Click eTickets Team</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8em; color: #888; text-align: center;">This is an automated email, please do not reply.</p>
                </div>
            `;
        } else {
            emailHtmlContent = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #fff;">
                    <h2 style="color: #4a00e0; text-align: center;">Your Click eTickets Purchase Confirmation</h2>
                    <p>Hello ${customerInfo.firstName || 'Valued Customer'},</p>
                    <p>Thank you for your purchase from Click eTickets! Your ${finalTicketsForEmail.length} ticket(s) are confirmed.</p>
                    <p>You can view your tickets at any time by logging into your account and visiting the <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/mytickets.html" style="color: #4a00e0; text-decoration: none; font-weight: bold;">"My Tickets" section</a> on our website.</p>
                    <p>If you have any questions, please don't hesitate to contact us.</p>
                    <p>Best regards,<br>The Click eTickets Team</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8em; color: #888; text-align: center;">This is an automated email, please do not reply.</p>
                </div>
            `;
        }
        const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, "Click eTickets");
        const recipient = new Recipient(customerInfo.email);
        const emailParams = new EmailParams();
        emailParams.setFrom(sender);
        emailParams.setTo([recipient]);
        emailParams.setSubject(`Your Purchase Confirmation from Click eTickets`);
        console.log(emailParams);
        emailParams.setHtml(emailHtmlContent);

        await mailerSend.email.send(emailParams);

        res.status(200).json({ message: 'Tickets purchased successfully!' });

    } catch (transactionError) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error("Transaction error during ticket purchase:", transactionError);
        res.status(500).json({ message: transactionError.message || 'Failed to complete purchase due to a server error.' });
    }
});

// USER AUTHENTICATION & MANAGEMENT ROUTES
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.status(200).json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

app.patch('/api/users/:id/role', authenticateToken, isAdmin, [
    body('role').isIn(['admin', 'user']).withMessage('Invalid role provided.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    try {
        if (req.params.id === req.user.userId) {
            return res.status(403).json({ message: 'Forbidden: You cannot change your own role.' });
        }
        const updatedUser = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true, runValidators: true }).select('-password');
        if (!updatedUser) return res.status(404).json({ message: 'User not found.' });
        res.status(200).json({ message: 'User role updated successfully.', user: updatedUser });
    } catch (err) {
        console.error("Error updating user role:", err);
        res.status(500).json({ message: 'Failed to update user role.' });
    }
});

app.post('/api/users/register', [
    body('firstName').notEmpty().withMessage('First name is required.'),
    body('lastName').notEmpty().withMessage('Last name is required.'),
    body('email').isEmail().withMessage('Please include a valid email.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    try {
        const { firstName, lastName, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ firstName, lastName, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        console.error("Error during user registration:", err);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

app.post('/api/users/login', [
    body('email').isEmail().withMessage('Please include a valid email.').normalizeEmail(),
    body('password').exists().withMessage('Password is required.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: "Logged in successfully!",
            token: token,
            role: user.role
        });
    } catch (err) {
        console.error("Error during user login:", err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found. Please log in again.' });
        }
        res.status(200).json({ user: user });
    } catch (error) {
        console.error("Server error fetching profile:", error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

app.patch('/api/users/profile/password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found. Please log in again.' });
        }
        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(400).json({ message: 'Incorrect current password.' });
        }
        if (await bcrypt.compare(newPassword, user.password)) {
            return res.status(400).json({ message: 'New password cannot be the same as the old password.' });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error("Server error changing password:", error);
        res.status(500).json({ message: 'Server error changing password.' });
    }
});

app.get('/api/users/tickets', authenticateToken, async (req, res) => {
    try {
        const tickets = await Ticket.find({ userId: req.user.userId })
            .populate('eventId', 'eventName eventDate eventTime flyerImagePath')
            .sort({ purchaseDate: -1 });
        const formattedTickets = tickets.map(ticket => ({
            ticketId: ticket._id,
            eventName: ticket.eventId ? ticket.eventId.eventName : 'Unknown Event',
            eventDate: ticket.eventId ? ticket.eventId.eventDate : new Date(),
            eventTime: ticket.eventId ? ticket.eventId.eventTime : '',
            flyerImagePath: ticket.eventId ? ticket.eventId.flyerImagePath : null,
            ticketType: ticket.ticketType,
            price: ticket.price,
            purchaseDate: ticket.purchaseDate,
        }));
        res.status(200).json(formattedTickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ message: 'Server error fetching tickets.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});