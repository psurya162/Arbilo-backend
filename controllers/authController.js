const db = require("../config/db_settings");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const {sendCredentialsEmail,sendPasswordChangeNotification,sendWelcomeEmail,sendContactUsNotification} = require("../services/emailService");
const generator = require('generate-password');



// Secret for JWT
const JWT_SECRET = "dfghjnhbgvf";

// User Signup
const signup = async (req, res) => {
  try {
    // Validate email and password using express-validator
    await body("email")
      .isEmail()
      .withMessage("Please enter a valid email address")
      .run(req);
    await body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .run(req);

    const errors = validationResult(req);

    // If there are validation errors, send a detailed response
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, confirmPassword } = req.body;

    // Check if the passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await db.select("tbl_users", "*", `email='${normalizedEmail}'`);
    console.log(existingUser); // Debugging the query result

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ message: "Email is already registered. Please log in." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    await db.insert("tbl_users", { name, email: normalizedEmail, password: hashedPassword });

    // Send welcome email (optional)
    await sendWelcomeEmail(name, email);

    // Send success response
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);

    // Handle duplicate email error
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email is already registered. Please log in." });
    }

    // Handle other errors
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// User Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await db.select("tbl_users", "*", `email='${email}'`);
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Password Incorrect" });
    }

    // Generate a new session token
    const sessionToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Update the user's session token in the database
    await db.update("tbl_users", { session_token: sessionToken }, `id=${user.id}`);

    // Capture the user's IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Store the login activity in the database
    await db.insert("tbl_login_activity", {
      user_id: user.id,
      ip_address: ipAddress,
    });

    // Return the session token and user data in the response
    res.json({
      message: "Login successful",
      token: sessionToken,
      user, // Include the user data in the response
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getUserProfile = async (req, res) => {
  try {
      const userId = req.userId; // Set from middleware
      

      if (!userId) {
          console.error('User ID not found in request');
          return res.status(400).json({ error: 'User not authenticated' });
      }

      console.log('Fetching user data for User ID:', userId);

      // Fetch user data from the database
      const userData = await db.select("tbl_users", "*", `id = '${userId}'`, true);
      

      if (!userData) {
          console.error('No user data found for User ID:', userId);
          return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ userData });
  } catch (error) {
      console.error('Error fetching user data:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
  }
};


// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await db.select("tbl_users", "*", `email='${email}'`);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token with 5 minutes expiry
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "5m" }
    );

     const transporter = nodemailer.createTransport({
          host: "smtp.hostinger.com",
          port: 465,
          secure: true, // Use SSL
          auth: {
            user: "alok.radiolabs@getdreamlife.com",
            pass: "Alok@up53",
          },
        });

    // const transporter = nodemailer.createTransport({
    //   host: '145.223.23.3',  // Your server's public IP or hostname
    //   port: 1025,            // MailHog's SMTP port
    //   secure: false,         // No SSL
    //   auth: false,  
    // });

    const resetLink = `http://localhost:5173/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: "alok.radiolabs@getdreamlife.com",
      to: email,
      subject: "Password Reset",
      html: `
        <p>Dear ${user.name},</p>
        <p>Click the link below to reset your password. The link will expire in 5 minutes:</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; text-decoration: none; padding: 10px 15px; border-radius: 5px; font-size: 16px;">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Regards,<br>Arbilo</p>
      `,
    });

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Error sending password reset email:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate new password (example: at least 8 characters, contains numbers and letters)
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(400)
          .json({
            message: "The reset link has expired. Please request a new one.",
          });
      }
      return res.status(400).json({ message: "Invalid or tampered token." });
    }

    const userId = decoded.id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password in the database
    const result = await db.update(
      "tbl_users",
      { password: hashedPassword },
      `id=${userId}`
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send success response
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// Update User Name
const updateUserName = async (req, res) => {
  try {
    const userId = req.userId; // Set from middleware
    const { newName } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    if (!newName || newName.trim() === "") {
      return res.status(400).json({ message: "New name cannot be empty" });
    }

    // Update user name in the database
    const result = await db.update(
      "tbl_users",
      { name: newName },
      `id=${userId}`
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Name updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const userId = req.userId; // Set from middleware
    const { currentPassword, newPassword, confirmPassword } = req.body;

    console.log('Attempting password change for user ID:', userId);

    if (!userId) {
      console.log('No userId found in request');
      return res.status(400).json({ message: "User not authenticated" });
    }

    if (newPassword !== confirmPassword) {
      console.log('Password mismatch');
      return res.status(400).json({ message: "New passwords do not match" });
    }

    // Fetch user data from the database - removed quotes around userId
    const user = await db.select("tbl_users", "*", `id=${userId}`);
    console.log('Database query result:', user);

    if (!user) {
      console.log('No user found with ID:', userId);
      return res.status(404).json({ message: "User not found" });
    }

    // Check if current password is correct
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password in the database
    const result = await db.update(
      "tbl_users",
      { password: hashedPassword },
      `id=${userId}`
    );
    console.log('Update result:', result);

    if (result.rowCount === 0) {
      console.log('Update failed - no rows affected');
      return res.status(404).json({ message: "User not found" });
    }

    // Send notification email
    await sendPasswordChangeNotification(user.name, user.email);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error('Error in changePassword:', err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// Function to create a user with a generated password and send it via email
const createUserAndSendCredentials = async (req, res) => {
  try {
    const { email,name  } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: "Email and Name are required" });
    }

    // Check if user already exists
    const existingUser = await db.select("tbl_users", "*", `email='${email}'`);
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Generate a random password
    const password = generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
    });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    await db.insert("tbl_users", { email,name, password: hashedPassword });

    // Send email with credentials
    await sendCredentialsEmail(email, password);

    // Send success response
    res.status(201).json({ message: "User created and credentials sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// Contact Us - Handle form submission
const contactUs = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate the input fields
    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Insert the contact message into the database
    await db.insert("tbl_contact_us", { name, email: normalizedEmail, message });

    // Send an email notification to the admin
    await sendContactUsNotification(name, email, message);

    // Return success response
    res.status(201).json({ message: "Your message has been received. We'll get back to you shortly!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};






module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserName,
  changePassword,
  createUserAndSendCredentials,
  contactUs
 
  

};
