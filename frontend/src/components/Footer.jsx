import React from 'react';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>🏥 MediQueue</h3>
          <p>Streamlining healthcare with real-time queue management and appointments</p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#about">About Us</a></li>
            <li><a href="#contact">Contact</a></li>
            <li><a href="#privacy">Privacy Policy</a></li>
            <li><a href="#terms">Terms of Service</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Features</h4>
          <ul>
            <li>📅 Appointment Booking</li>
            <li>⏳ Real-time Queue Management</li>
            <li>🏥 Find Nearby Hospitals</li>
            <li>👨‍⚕️ Doctor Availability</li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact Info</h4>
          <p>📧 support@queuemgmt.com</p>
          <p>📞 +1-800-QUEUE-MGT</p>
          <p>📍 Healthcare Center, Main St</p>
        </div>

        <div className="footer-section">
          <h4>Follow Us</h4>
          <div className="social-links">
            <a href="#facebook" className="social-icon">f</a>
            <a href="#twitter" className="social-icon">𝕏</a>
            <a href="#linkedin" className="social-icon">in</a>
            <a href="#instagram" className="social-icon">📷</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} MediQueue. All rights reserved.</p>
        <p>Designed with ❤️ for better healthcare</p>
      </div>
    </footer>
  );
}
