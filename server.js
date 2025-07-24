require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // NEW: Add axios to make external API calls

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create an 'uploads' directory if it doesn't exist
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// MongoDB Connection
mongoose.connect(process.env.DB_CONNECTION_STRING)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch(err => console.error('Connection error', err));

// --- SUBMISSION SCHEMA ---
const submissionSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    businessName: String,
    eventName: String,
    phone: String,
    ticketCount: Number,
    flyerImagePath: String,
    tickets: [{
        type: { type: String },
        price: { type: String },
        includes: { type: String }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        default: 'pending'
    },
    submittedAt: { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', submissionSchema);

// --- USER SCHEMA AND MODEL ---
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// --- NOTE: We've removed the Ticket schema and model as we are now using an external service ---


// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ===============================================
// AUTHENTICATION MIDDLEWARE
// ===============================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user; 
        next();
    });
}


// --- API ROUTES ---

// POST: Handle new event form submission
app.post('/api/submit', upload.single('flyer'), async (req, res) => {
    const ticketData = req.body.ticket_type.map((type, index) => ({
        type: type,
        price: req.body.ticket_price[index],
        includes: req.body.ticket_includes[index]
    }));
    const newSubmission = new Submission({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        businessName: req.body.businessName,
        eventName: req.body.eventName,
        phone: req.body.phone,
        ticketCount: req.body.ticketCount,
        flyerImagePath: req.file ? req.file.path : null,
        tickets: ticketData
    });
    try {
        const savedSubmission = await newSubmission.save();
        console.log('Submission saved:', savedSubmission);
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'denicia@example.com', // Replace with your admin email
            subject: `New Event Submission: ${savedSubmission.eventName}`,
            text: `A new event from ${savedSubmission.firstName} ${savedSubmission.lastName} for "${savedSubmission.eventName}" has been submitted.`
        });
        console.log('Email notification sent.');
        res.status(200).json({ message: 'Submission received successfully!' });
    } catch (err) {
        console.error("Error processing submission", err);
        res.status(500).json({ error: 'Failed to process submission.' });
    }
});

// GET: Fetch all submissions for the admin dashboard (Add authenticateToken here if needed for admin access)
app.get('/api/submissions', async (req, res) => {
    try {
        const submissions = await Submission.find({}).sort({ submittedAt: -1 });
        res.status(200).json(submissions);
    } catch (err) {
        console.error("Error fetching submissions", err);
        res.status(500).json({ error: 'Failed to fetch submissions.' });
    }
});

// GET: Fetch only approved events for the public homepage
app.get('/api/events', async (req, res) => {
    try {
        const approvedEvents = await Submission.find({ status: 'approved' }).sort({ submittedAt: -1 });
        res.status(200).json(approvedEvents);
    } catch (err) {
        console.error("Error fetching approved events:", err);
        res.status(500).json({ error: 'Failed to fetch events.' });
    }
});

// PATCH: Update the status of a submission (Add authenticateToken here if needed for admin access)
app.patch('/api/submissions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approved', 'denied'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status provided.' });
        }
        const updatedSubmission = await Submission.findByIdAndUpdate(
            id,
            { status: status },
            { new: true }
        );
        if (!updatedSubmission) {
            return res.status(404).json({ error: 'Submission not found.' });
        }
        res.status(200).json(updatedSubmission);
    } catch (err) {
        console.error('Error updating submission status:', err);
        res.status(500).json({ error: 'Failed to update submission status.' });
    }
});

// POST: Register a new user
app.post('/api/users/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create and save the new user
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword // Save the hashed password
        });
        await newUser.save();

        // Send back a success response (but not the password)
        res.status(201).json({
            message: "User registered successfully!",
            userId: newUser._id
        });

    } catch (err) {
        console.error('Error during user registration:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// POST: Login a user
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        // Compare submitted password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        // If passwords match, create a JWT
        const payload = { userId: user._id };
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Use your JWT_SECRET from .env
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Send the token back to the client along with user's first name and email (optional but good for UX)
        res.status(200).json({
            message: "Logged in successfully!",
            token: token,
            firstName: user.firstName, // Send first name for direct display if needed
            email: user.email // Send email for direct display if needed
        });

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// GET User Profile (no change)
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
            }
        });
    } catch (error) {
        console.error('Server error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

// PATCH Change User Password (no change)
app.patch('/api/users/profile/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password.' });
        }
        
        const isNewPasswordSame = await bcrypt.compare(newPassword, user.password);
        if (isNewPasswordSame) {
            return res.status(400).json({ message: 'New password cannot be the same as the old password.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password updated successfully.' });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Server error changing password.' });
    }
});

// ===============================================
// NEW ROUTE: GET User Tickets from an External API
// ===============================================
app.get('/api/users/tickets', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const externalApiUrl = 'https://api.ticket-generator.com/v1/user/tickets';
        const apiKey = process.env.TICKET_GENERATOR_API_KEY; // You would get this from the service

        // A mock response for demonstration since the API doesn't exist
        const mockApiResponse = {
            tickets: [
                {
                    ticketId: 'tkt_12345',
                    eventName: 'Summer Music Fest',
                    eventDate: '2025-08-05',
                    ticketType: 'VIP Access',
                    qrCodeImageUrl: 'https://placehold.co/100x100/ffffff/4a00e0?text=QR_1'
                },
                {
                    ticketId: 'tkt_67890',
                    eventName: 'Beachside Bonfire Party',
                    eventDate: '2025-07-12',
                    ticketType: 'General Admission',
                    qrCodeImageUrl: 'https://placehold.co/100x100/ffffff/4a00e0?text=QR_2'
                }
            ]
        };

        // --- In a real scenario, you would use this instead of the mock data ---
        // const externalResponse = await axios.get(externalApiUrl, {
        //     headers: {
        //         'Authorization': `Bearer ${apiKey}`,
        //         'User-ID': userId // Assuming the external API expects the user ID
        //     }
        // });
        // const tickets = externalResponse.data.tickets;

        const tickets = mockApiResponse.tickets;

        if (!tickets || tickets.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(tickets);

    } catch (error) {
        console.error('Error fetching user tickets from external API:', error);
        res.status(500).json({ message: 'Server error fetching tickets.' });
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});