const nodemailer = require("nodemailer");

// Configure transporter for Hostinger SMTP
 const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: "alok.radiolabs@getdreamlife.com",
        pass: "Alok@up53",
      },
    });
const sendWelcomeEmail = async (name, email) => {
  try {
    const mailOptions = {
      from: '"Radiolabs" <alok.radiolabs@getdreamlife.com>', // Sender email
      to: email,
      subject: "Welcome to Our Service",
      html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td align="center" bgcolor="#4CAF50" style="padding: 20px;">
                            <img src="https://yourcompany.com/logo.png" alt="Company Logo" width="100" style="display: block;">
                        </td>
                    </tr>
                    <tr>
                        <td align="center" bgcolor="#4CAF50" style="padding: 20px; color: #ffffff; font-size: 24px; font-weight: bold;">
                            Welcome to Our Service!
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 20px; color: #333333; font-size: 16px;">
                            <p>Dear <strong>${name}</strong>,</p>
                            <p>We’re thrilled to have you on board! Get ready to explore amazing features and make the most out of our service.</p>
                            <p>Click the button below to get started:</p>
                            <a href="https://yourwebsite.com/login" style="display: inline-block; background-color: #4CAF50; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 5px; font-size: 16px; margin-top: 20px;">Get Started</a>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" bgcolor="#f4f4f4" style="padding: 15px; font-size: 14px; color: #777777;">
                            <p>Stay Connected</p>
                            <table cellpadding="0" cellspacing="0">
                                <tr>
                                    <td><a href="https://facebook.com/yourpage"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="30" alt="Facebook"></a></td>
                                    <td width="10"></td>
                                    <td><a href="https://twitter.com/yourpage"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" width="30" alt="Twitter"></a></td>
                                    <td width="10"></td>
                                    <td><a href="https://instagram.com/yourpage"><img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" width="30" alt="Instagram"></a></td>
                                </tr>
                            </table>
                            <p>&copy; 2025 Your Company. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent successfully");
  } catch (err) {
    console.error("Error sending welcome email:", err);
    throw new Error("Failed to send welcome email");
  }
};

// Function to send password change notification email
const sendPasswordChangeNotification = async (name, email) => {
  try {
    const mailOptions = {
      from: '"Radiolabs" <alok.radiolabs@getdreamlife.com>', // Sender email
      to: email,
      subject: "Your Password Has Been Changed Successfully",
      html: `
        <p>Dear ${name},</p>

        <p>We wanted to inform you that your password has been successfully changed. If you made this change, no further action is required.</p>

        <p>However, if you did not request this change, please reset your password immediately and contact our support team at <a href="mailto:hello@arbilo.com">hello@arbilo.com</a> for assistance.</p>

        <p>For security, we recommend regularly updating your password and keeping your account details safe.</p>

        <p>Best Regards,<br>The Arbilo Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Password change notification email sent successfully");
  } catch (err) {
    console.error("Error sending password change notification email:", err);
    throw new Error("Failed to send password change notification email");
  }
};






const sendCredentialsEmail = async (email, password) => {
  try {
    await transporter.sendMail({
      from: "alok.radiolabs@getdreamlife.com",
      to: email,
      subject: "Your Arbilo Premium Access is Ready! 🎉",
      html: `
        <p>Dear User,</p>
        <p>Your Arbilo-Arbitrage Premium Plan access is now fully set up! You can log in and start exploring real-time arbitrage signals right away.</p>

        <p><strong>Your Login Credentials:</strong></p>
        <ul>
          <li>🔹 <strong>Platform:</strong> <a href="https://arbilo.com">https://arbilo.com</a></li>
          <li>🔹 <strong>Email:</strong> ${email}</li>
          <li>🔹 <strong>Password:</strong> ${password}</li>
        </ul>

        <p>📌 For security reasons, we recommend changing your password after logging in.</p>

        <p><strong>Getting Started:</strong></p>
        <ul>
          <li>✅ <strong>Log in</strong> – Visit Arbilo and enter your credentials.</li>
          <li>✅ <strong>Explore Signals</strong> – Check out ArbiPair and ArbiTrack for real-time arbitrage opportunities.</li>
          <li>✅ <strong>Manage Your Account</strong> – Update your password and subscription details in the settings.</li>
        </ul>

        <p><strong>Need Help?</strong></p>
        <p>If you have any questions or need assistance, feel free to reach out to us at <a href="mailto:hello@arbilo.com">hello@arbilo.com</a> — we’re happy to help!</p>

        <p>Thank you for joining Arbilo! Wishing you success in your trading journey. 🚀</p>

        <p>Best Regards,<br>The Arbilo Team</p>
      `,
    });
  } catch (err) {
    console.error("Error sending credentials email:", err);
    throw err;
  }
};

const sendContactUsNotification = async (name, email, message) => {
  try {
    // Set up the SMTP transporter (using an SMTP service like Mailtrap, SendGrid, etc.)
    const transporter = nodemailer.createTransport({
      host: '145.223.23.3',  // Your server's public IP or hostname
  port: 1025,            // MailHog's SMTP port
  secure: false,         // No SSL
  auth: false,  
    });

    const adminEmail = 'admin@example.com'; // The admin email to receive contact messages
    const subject = 'New Contact Us Message';
    const text = `
      You have received a new message from the Contact Us form:
      
      Name: ${name}
      Email: ${email}
      Message: ${message}
    `;

    // Send the email
    await transporter.sendMail({
      from: email,              // Sender's email (user's email from the Contact Us form)
      to: adminEmail,           // Admin email to receive the notification
      subject: subject,         // Subject of the email
      text: text,               // Body content of the email
    });

    console.log('Contact Us notification sent successfully!');
  } catch (err) {
    console.error('Error sending Contact Us notification:', err);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordChangeNotification,
  sendCredentialsEmail,
  sendContactUsNotification
};
