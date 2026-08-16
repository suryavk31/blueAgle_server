/**
 * Policy Seeder
 * Run once: node server/seeds/policySeed.js
 *
 * Populates 11 legal policy documents in the database:
 *  1. Privacy Policy
 *  2. Terms & Conditions
 *  3. Return & Refund Policy
 *  4. Cancellation Policy
 *  5. Shipping & Delivery Policy
 *  6. Return Policy
 *  7. Account Deletion Policy (Compliant with Google Play & App Store guidelines)
 *  8. Cookie Policy
 *  9. Contact Information & Support
 * 10. About Us
 * 11. FAQ & Help Center
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Policy, PolicyVersion } = require('../models');
const { convertHtmlToPolicyJson } = require('../utils/policyMigration');

const POLICIES = [
    {
        type: 'account-deletion',
        title: 'Account Deletion & Data Retention Policy',
        status: 'Published',
        version: 1,
        seoTitle: 'Account Deletion Policy | BlueAgle',
        seoDescription: 'Learn how to request account deletion on BlueAgle, what data is removed, and what records are retained for legal and tax compliance.',
        seoKeywords: 'account deletion, delete account, data retention, privacy, user data removal, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/account-deletion',
        content: `
<h2>1. Overview</h2>
<p>At BlueAgle, we respect your right to privacy and control over your personal data. This Account Deletion & Data Retention Policy explains how you can request the permanent deletion of your BlueAgle account, what data will be deleted, what data must be retained under applicable laws, and your options regarding data portability.</p>

<h2>2. How to Request Account Deletion</h2>
<p>You can request the deletion of your account at any time using one of the following methods:</p>
<ul>
    <li><strong>In-App / Website Self-Service (Recommended):</strong> Log in to your BlueAgle account, navigate to <strong>My Account &gt; Privacy &amp; Security</strong>, and click <strong>Delete My Account</strong> or visit <a href="/account/delete">https://blueeagle.com/account/delete</a> directly.</li>
    <li><strong>Email Request:</strong> Send an email from your registered email address to <a href="mailto:privacy@blueeagle.com">privacy@blueeagle.com</a> with the subject line <em>"Account Deletion Request"</em>.</li>
</ul>

<h2>3. Step-by-Step Account Deletion Flow</h2>
<ol>
    <li>Navigate to the <strong>Delete Account</strong> page in your user profile settings.</li>
    <li>Review the information regarding permanent data removal and legal data retention.</li>
    <li>Select an optional reason for your account deletion to help us improve our services.</li>
    <li>Check the mandatory confirmation box stating <em>"I understand this action is permanent and cannot be undone."</em></li>
    <li>Confirm your action by typing <code>DELETE</code> or completing verification.</li>
    <li>Click <strong>DELETE MY ACCOUNT</strong> to finalize the request.</li>
</ol>

<h2>4. Data That Will Be Permanently Removed</h2>
<p>Upon account deletion confirmation, the following data will be immediately and permanently purged from our active systems:</p>
<ul>
    <li>Active user sessions and refresh tokens (logged out across all devices).</li>
    <li>Saved shipping and billing addresses.</li>
    <li>Items currently stored in your active shopping cart or saved wishlist.</li>
    <li>Mobile push notification tokens and marketing communication preferences.</li>
    <li>User profile photos, avatars, and custom profile attributes.</li>
</ul>

<h2>5. Legally Required Data Retention (Anonymization Protocol)</h2>
<p>In compliance with statutory obligations under financial, tax, consumer protection, and fraud prevention regulations (including Indian GST laws, Companies Act, and IT Act guidelines), BlueAgle does <strong>NOT</strong> hard-delete completed transaction records.</p>
<p>Instead, your personal information associated with completed orders, tax invoices, and payment receipts is subjected to an automated <strong>Anonymization Protocol</strong>:</p>
<ul>
    <li>Your full name is replaced with <code>Anonymized User #[ID]</code>.</li>
    <li>Your email address is replaced with a randomized string (e.g., <code>deleted_user_[ID]@anonymized.local</code>).</li>
    <li>Your phone number is scrubbed and replaced with <code>DELETED_[ID]</code>.</li>
    <li>Order item history, invoice numbers, GST calculations, and payment transaction IDs are preserved solely for tax auditing, accounting verification, and legal defense.</li>
</ul>

<h2>6. Processing Timelines & Confirmation</h2>
<ul>
    <li><strong>Immediate Action:</strong> Account access is disabled and active tokens are revoked instantly upon clicking confirm.</li>
    <li><strong>Email Confirmation:</strong> A final account deletion receipt is dispatched to your registered email address.</li>
    <li><strong>System Cleanup:</strong> Full database anonymization and cache purge complete within <strong>24 to 48 hours</strong>.</li>
    <li><strong>Backup Purge:</strong> Encrypted system backups are overwritten on a rolling 30-day rotation cycle.</li>
</ul>

<h2>7. Loyalty Points, Wallets & Pending Transactions</h2>
<p>Before requesting account deletion, please ensure:</p>
<ul>
    <li>All pending orders have been delivered or cancelled.</li>
    <li>Any active refund requests or chargebacks have been fully settled.</li>
    <li>Any unredeemed promotional loyalty points, cashback coupons, or gift vouchers are utilized, as they will be forfeited upon account termination and cannot be restored or converted to cash.</li>
</ul>

<h2>8. Third-Party App & Social Login Permissions</h2>
<p>If you created your BlueAgle account using Google Sign-In or social logins, deleting your BlueAgle account does not automatically revoke third-party app authorizations. You may manage or revoke BlueAgle's access at any time through your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">Google Security Settings</a>.</p>

<h2>9. Contact Privacy Support</h2>
<p>If you have any questions, concerns, or requests regarding this Account Deletion Policy, please contact our Data Protection Officer:</p>
<p>
    <strong>BlueAgle Data Privacy Office</strong><br/>
    Email: <a href="mailto:privacy@blueeagle.com">privacy@blueeagle.com</a><br/>
    Support Hotline: +91 1800-123-4567<br/>
    Operating Hours: Monday – Saturday, 9:00 AM – 6:00 PM IST
</p>
        `
    },
    {
        type: 'privacy',
        title: 'Privacy Policy',
        status: 'Published',
        version: 1,
        seoTitle: 'Privacy Policy | BlueAgle',
        seoDescription: 'Read the official BlueAgle Privacy Policy to understand how we collect, use, protect, and handle your personal information.',
        seoKeywords: 'privacy policy, data privacy, user data, security, GDPR, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/privacy',
        content: `
<h2>1. Introduction</h2>
<p>Welcome to BlueAgle ("Company", "we", "our", "us"). We are committed to protecting your privacy and ensuring your personal information is handled safely and responsibly. This Privacy Policy governs your use of our website at <a href="/">https://blueeagle.com</a> and our related services.</p>

<h2>2. Information We Collect</h2>
<p>We collect information to provide better services to all our users. The categories of data we collect include:</p>
<ul>
    <li><strong>Personal Identity Data:</strong> Name, phone number, email address, shipping and billing address.</li>
    <li><strong>Transaction &amp; Order Data:</strong> Items purchased, order history, payment method selection, payment transaction IDs (we do NOT store credit/debit card numbers or PINs).</li>
    <li><strong>Technical &amp; Device Data:</strong> IP address, browser type, operating system, device identifiers, referral URLs, and cookies.</li>
    <li><strong>Communication Data:</strong> Customer support inquiries, feedback, and reviews submitted to our platform.</li>
</ul>

<h2>3. How We Use Your Information</h2>
<p>We process your personal data for the following lawful business purposes:</p>
<ul>
    <li>Fulfilling and delivering your product orders.</li>
    <li>Processing secure payments via authorized payment gateways (e.g., Razorpay).</li>
    <li>Sending order status updates, shipment tracking links, and transactional SMS/emails.</li>
    <li>Providing customer support and resolving queries.</li>
    <li>Detecting, preventing, and mitigating fraudulent or unauthorized activities.</li>
    <li>Complying with statutory accounting, tax, and regulatory obligations.</li>
</ul>

<h2>4. Information Sharing &amp; Third Parties</h2>
<p>We do not sell, rent, or trade your personal information. We share limited data only with trusted third-party service providers essential for platform operations:</p>
<ul>
    <li><strong>Logistics &amp; Courier Partners:</strong> Delivery agencies receive your name, delivery address, and contact phone number to fulfill delivery.</li>
    <li><strong>Payment Processing Partners:</strong> Payment gateways (Razorpay) receive order reference numbers and transaction values for encrypted processing.</li>
    <li><strong>Authentication Providers:</strong> Firebase Authentication processes OTP verification and secure login sessions.</li>
    <li><strong>Legal Obligations:</strong> We may disclose data if required by law, court order, or governmental authority.</li>
</ul>

<h2>5. Data Security</h2>
<p>We implement industry-standard administrative, technical, and physical security measures to safeguard your personal data. All data transmissions are encrypted using SSL/TLS (HTTPS) encryption. Access to sensitive data is strictly restricted to authorized personnel.</p>

<h2>6. Your Privacy Rights</h2>
<p>Depending on your jurisdiction, you have the right to access, correct, export, or request the permanent deletion of your personal data. You may exercise your right to delete your account via <a href="/account/delete">Account Deletion Settings</a>.</p>

<h2>7. Children's Privacy</h2>
<p>Our platform is not directed to children under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal information, please contact us immediately.</p>

<h2>8. Contact Us</h2>
<p>For privacy inquiries or grievances, contact our Data Protection Officer at <a href="mailto:privacy@blueeagle.com">privacy@blueeagle.com</a>.</p>
        `
    },
    {
        type: 'terms',
        title: 'Terms & Conditions',
        status: 'Published',
        version: 1,
        seoTitle: 'Terms & Conditions | BlueAgle',
        seoDescription: 'Review the legal Terms & Conditions governing the use of the BlueAgle platform and purchase of products.',
        seoKeywords: 'terms and conditions, terms of service, user agreement, legal rules, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/terms',
        content: `
<h2>1. Agreement to Terms</h2>
<p>By accessing or using the BlueAgle website and services, you agree to be bound by these Terms &amp; Conditions and all applicable laws and regulations. If you do not agree with any part of these terms, you must discontinue use of the platform immediately.</p>

<h2>2. Eligibility &amp; User Accounts</h2>
<ul>
    <li>You must be at least 18 years of age or accessing under the supervision of a parent or legal guardian.</li>
    <li>You are responsible for maintaining the confidentiality of your account credentials and OTP codes.</li>
    <li>You agree to provide accurate, current, and complete information during registration and checkout.</li>
</ul>

<h2>3. Product Pricing &amp; Availability</h2>
<ul>
    <li>All prices listed on BlueAgle are expressed in Indian Rupees (INR) and include applicable statutory taxes unless stated otherwise.</li>
    <li>We reserve the right to correct pricing errors or modify product prices at any time without prior notice.</li>
    <li>Product availability is subject to stock levels. In the event of stock shortages after order placement, we will issue a full refund.</li>
</ul>

<h2>4. Orders &amp; Payments</h2>
<ul>
    <li>An order placement constitutes an offer to purchase. Order acceptance is confirmed upon dispatch notification.</li>
    <li>We accept payment via Credit/Debit Cards, Net Banking, UPI, Wallets, and Cash on Delivery (COD) where applicable.</li>
    <li>We reserve the right to decline or cancel orders suspected of fraudulent activity or policy violation.</li>
</ul>

<h2>5. Intellectual Property Rights</h2>
<p>All content on the BlueAgle platform—including trademarks, logos, text, graphics, images, software code, and UI design—is the exclusive property of BlueAgle and protected by copyright and intellectual property laws.</p>

<h2>6. Limitation of Liability</h2>
<p>In no event shall BlueAgle, its directors, employees, or partners be liable for any indirect, incidental, punitive, or consequential damages arising from the use of our services or products.</p>

<h2>7. Governing Law &amp; Jurisdiction</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of India. Any legal disputes arising hereunder shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.</p>
        `
    },
    {
        type: 'return',
        title: 'Return & Refund Policy',
        status: 'Published',
        version: 1,
        seoTitle: 'Return & Refund Policy | BlueAgle',
        seoDescription: 'Understand BlueAgle policy regarding product returns, eligibility criteria, replacement requests, and refund timelines.',
        seoKeywords: 'return policy, refund policy, replacement, returns criteria, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/return',
        content: `
<h2>1. Return Eligibility Window</h2>
<p>Customers may request a return or replacement within <strong>7 calendar days</strong> from the date of order delivery, provided the product meets the return criteria outlined below.</p>

<h2>2. Return Criteria &amp; Conditions</h2>
<p>To qualify for a return or replacement, the item must fulfill the following conditions:</p>
<ul>
    <li>Item was received in a damaged, defective, or incorrect state.</li>
    <li>Item must be unused, unwashed, unaltered, and in original condition.</li>
    <li>Original brand tags, packaging boxes, MRP labels, user manuals, and warranty cards must remain intact.</li>
    <li>Certain non-returnable categories (e.g., innerwear, personal care, perishable goods) are excluded unless received damaged.</li>
</ul>

<h2>3. Return Process</h2>
<ol>
    <li>Log in to your account and go to <strong>My Orders</strong>.</li>
    <li>Select the relevant order and item, then click <strong>Request Return / Replacement</strong>.</li>
    <li>Attach unboxing photographs or video proof showing the damage or defect.</li>
    <li>Our quality assurance team will evaluate your request within 24 business hours.</li>
    <li>Upon approval, a courier partner will be assigned for reverse pickup at no additional cost.</li>
</ol>

<h2>4. Refund Processing &amp; Timelines</h2>
<p>Once the returned item passes physical inspection at our fulfillment warehouse, refunds are initiated according to your original payment method:</p>
<ul>
    <li><strong>Prepaid Orders (Cards/UPI/Net Banking):</strong> Refund credited back to the original source within <strong>5–7 business days</strong>.</li>
    <li><strong>Cash on Delivery (COD) Orders:</strong> Refund transferred via NEFT/UPI bank transfer within <strong>3–5 business days</strong> after bank details confirmation.</li>
</ul>
        `
    },
    {
        type: 'cancellation',
        title: 'Cancellation Policy',
        status: 'Published',
        version: 1,
        seoTitle: 'Cancellation Policy | BlueAgle',
        seoDescription: 'Learn how to cancel an order on BlueAgle, order cancellation deadlines, and refund procedures.',
        seoKeywords: 'cancellation policy, cancel order, order cancellation, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/cancellation',
        content: `
<h2>1. Order Cancellation Window</h2>
<p>Orders can be cancelled free of charge at any time <strong>before the shipment status updates to "Shipped" or "Out for Delivery"</strong>.</p>

<h2>2. How to Cancel an Order</h2>
<ul>
    <li><strong>Self-Service:</strong> Go to <strong>My Account &gt; My Orders</strong>, select the pending order, and click <strong>Cancel Order</strong>.</li>
    <li><strong>Customer Support:</strong> Contact our helpline at +91 1800-123-4567 or email <a href="mailto:support@blueeagle.com">support@blueeagle.com</a> with your order number.</li>
</ul>

<h2>3. Post-Dispatch Cancellations</h2>
<p>Once an order has been shipped, it cannot be cancelled through self-service. You may refuse delivery when the courier partner arrives. The package will return to our warehouse, and a refund will be processed minus applicable shipping fees.</p>

<h2>4. Cancellation Refunds</h2>
<ul>
    <li>For prepaid cancelled orders prior to dispatch, <strong>100% full refund</strong> will be credited to the original payment source within 3–5 business days.</li>
    <li>BlueAgle reserves the right to cancel orders due to pricing errors, suspected fraud, or stock unavailability.</li>
</ul>
        `
    },
    {
        type: 'shipping',
        title: 'Shipping & Delivery Policy',
        status: 'Published',
        version: 1,
        seoTitle: 'Shipping & Delivery Policy | BlueAgle',
        seoDescription: 'Find out about BlueAgle shipping rates, delivery timelines, courier partners, and order tracking.',
        seoKeywords: 'shipping policy, delivery timelines, shipping charges, tracking order, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/shipping',
        content: `
<h2>1. Shipping Coverage &amp; Logistics Partners</h2>
<p>BlueAgle delivers products across major pincodes in India through premier logistics partners including Blue Dart, Delhivery, Ekart, and Xpressbees.</p>

<h2>2. Processing &amp; Delivery Timelines</h2>
<ul>
    <li><strong>Order Processing:</strong> Orders are dispatched within 24 to 48 hours of order confirmation.</li>
    <li><strong>Metro Cities:</strong> Delivery within 2 to 4 business days.</li>
    <li><strong>Rest of India:</strong> Delivery within 4 to 7 business days.</li>
    <li><strong>Remote Locations:</strong> Delivery within 7 to 10 business days.</li>
</ul>

<h2>3. Shipping Charges</h2>
<ul>
    <li><strong>Free Shipping:</strong> Available on all orders above ₹499.</li>
    <li><strong>Standard Shipping:</strong> A flat ₹49 delivery fee applies to orders under ₹499.</li>
</ul>

<h2>4. Order Tracking</h2>
<p>Upon dispatch, you will receive an SMS and email notification containing your unique AWB tracking code and courier partner link. You can track your shipment real-time via <strong>My Orders</strong>.</p>
        `
    },
    {
        type: 'cookie',
        title: 'Cookie Policy',
        status: 'Published',
        version: 1,
        seoTitle: 'Cookie Policy | BlueAgle',
        seoDescription: 'Learn about how BlueAgle uses cookies and web tracking technologies to enhance user experience.',
        seoKeywords: 'cookie policy, web cookies, tracking technologies, analytics, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/cookie',
        content: `
<h2>1. What Are Cookies?</h2>
<p>Cookies are small text files stored on your browser or device when you visit websites. They help websites remember your preferences, keep you signed in, and understand user interaction.</p>

<h2>2. Types of Cookies We Use</h2>
<ul>
    <li><strong>Essential Cookies:</strong> Required for fundamental site functions such as authentication, cart storage, and security.</li>
    <li><strong>Performance &amp; Analytics Cookies:</strong> Help us measure visitor metrics and improve website navigation.</li>
    <li><strong>Functional Cookies:</strong> Remember custom settings, language preferences, and recent searches.</li>
</ul>

<h2>3. Managing Cookie Preferences</h2>
<p>You can adjust or disable cookie permissions in your browser settings at any time. Disabling essential cookies may impair core website functions like checkout.</p>
        `
    },
    {
        type: 'contact',
        title: 'Contact Information & Customer Support',
        status: 'Published',
        version: 1,
        seoTitle: 'Contact Us | BlueAgle Support',
        seoDescription: 'Get in touch with the BlueAgle customer support team for inquiries, complaints, and assistance.',
        seoKeywords: 'contact us, customer support, helpdesk, phone number, email support, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/contact',
        content: `
<h2>Contact BlueAgle Support</h2>
<p>Our dedicated customer assistance team is available to help you with order inquiries, returns, payments, and account services.</p>

<h3>Support Channels</h3>
<ul>
    <li><strong>Customer Email:</strong> <a href="mailto:support@blueeagle.com">support@blueeagle.com</a></li>
    <li><strong>Toll-Free Phone:</strong> +91 1800-123-4567</li>
    <li><strong>Operating Hours:</strong> Monday through Saturday, 9:00 AM – 7:00 PM IST</li>
    <li><strong>Corporate Office Address:</strong> BlueAgle Commerce Pvt Ltd, 4th Floor, Tech Park Tower, Koramangala, Bengaluru, Karnataka 560095.</li>
</ul>
        `
    },
    {
        type: 'about',
        title: 'About BlueAgle',
        status: 'Published',
        version: 1,
        seoTitle: 'About Us | BlueAgle',
        seoDescription: 'Learn more about BlueAgle, our mission, values, and commitment to quality e-commerce.',
        seoKeywords: 'about us, company profile, BlueAgle story, mission, values',
        canonicalUrl: 'https://blueeagle.com/policies/about',
        content: `
<h2>Welcome to BlueAgle</h2>
<p>BlueAgle is a modern e-commerce platform dedicated to bringing high-quality products, transparent pricing, and seamless online shopping experiences to customers across India.</p>

<h3>Our Core Promises</h3>
<ul>
    <li><strong>Authentic Products:</strong> Sourced directly from verified manufacturers and authorized distributors.</li>
    <li><strong>Fast Delivery:</strong> Partnered with top logistics networks to ensure timely order fulfillment.</li>
    <li><strong>Customer First:</strong> 100% secure payment gateways and transparent 7-day return policies.</li>
</ul>
        `
    },
    {
        type: 'faq',
        title: 'Frequently Asked Questions (FAQ)',
        status: 'Published',
        version: 1,
        seoTitle: 'FAQ & Help Center | BlueAgle',
        seoDescription: 'Find answers to common questions about ordering, payments, returns, shipping, and account management on BlueAgle.',
        seoKeywords: 'FAQ, help center, questions and answers, customer support, BlueAgle',
        canonicalUrl: 'https://blueeagle.com/policies/faq',
        content: `
<h2>Frequently Asked Questions</h2>

<h3>Q1: How do I place an order?</h3>
<p>Browse our catalog, add your desired items to the cart, click checkout, enter your delivery address, and choose your preferred payment method.</p>

<h3>Q2: How can I delete my BlueAgle account?</h3>
<p>Go to <strong>My Account &gt; Privacy &amp; Security &gt; Delete My Account</strong> or visit <a href="/account/delete">https://blueeagle.com/account/delete</a> to initiate an account deletion request.</p>

<h3>Q3: What payment options are supported?</h3>
<p>We support Credit/Debit Cards, Net Banking, UPI (Google Pay, PhonePe, Paytm), Wallet payments, and Cash on Delivery (COD).</p>

<h3>Q4: How do I track my shipment?</h3>
<p>Log in to your account, visit <strong>My Orders</strong>, and click on your active order to view live tracking status.</p>
        `
    }
];

async function seed() {
    try {
        await sequelize.sync({ alter: true });
        console.log('✅ Database connected & schema altered successfully');

        let createdCount = 0;
        let updatedCount = 0;

        for (const item of POLICIES) {
            const jsonStructure = convertHtmlToPolicyJson(item.title, item.content);
            const itemPayload = { ...item, contentJson: jsonStructure };

            const [policy, created] = await Policy.findOrCreate({
                where: { type: item.type },
                defaults: itemPayload,
            });

            if (!created) {
                await policy.update({
                    title: item.title,
                    content: item.content,
                    contentJson: jsonStructure,
                    status: item.status,
                    seoTitle: item.seoTitle,
                    seoDescription: item.seoDescription,
                    seoKeywords: item.seoKeywords,
                    canonicalUrl: item.canonicalUrl,
                    lastUpdated: new Date(),
                });
                updatedCount++;
            } else {
                createdCount++;
            }

            // Create initial PolicyVersion snapshot
            const versionCount = await PolicyVersion.count({ where: { policyId: policy.id } });
            if (versionCount === 0) {
                await PolicyVersion.create({
                    policyId: policy.id,
                    version: policy.version || 1,
                    title: policy.title,
                    content: policy.content,
                    contentJson: jsonStructure,
                    changeSummary: 'Initial policy document creation (JSON & HTML)',
                });
            }
        }

        console.log(`\n🎉 Policy Seeder Complete: ${createdCount} created, ${updatedCount} updated.\n`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Policy Seeder Failed:', err);
        process.exit(1);
    }
}

seed();
