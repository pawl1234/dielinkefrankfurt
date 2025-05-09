---

# Appointment Submission Form Specification

## Overview
The goal is to create a structured appointment submission form for newsletter contributors. Members will provide their event details in a standardized format using this form. Submissions will generate consistent, well-structured emails to reduce the manual effort required to format contributions into the newsletter.

---

## Requirements

### Form Features:

### Rich Text Editor (Main Text Field)
- **Formatting Options**:  
  - Bold, Italics, Bullet Points, Hyperlinks.
- **Character Length**:  
  - Maximum **1000 characters** (including tags).  
- **Error Handling**:  
  - Prevent user entry beyond the limit and display a message:  
    - `"Maximum character limit of 1000 reached."`

---

### File Upload (Cover Picture)
- **File Types Supported**:  
  - JPEG, PNG, PDF.
- **Aspect Ratio Requirements**:  
  - **4:3** for JPEG/PNG. Users must crop/resize to meet this requirement.
- **Preview on Upload**:
  - **JPEG/PNG**: Show cropped image as it will appear in the email.
  - **PDF**: List file name or generate a preview thumbnail (first page) if feasible.
- **Maximum File Size**:  
  - **5MB** per file.
- **Error Handling**:
  - If the file is too large: `"File size exceeds 5MB limit. Please upload a smaller file."`
  - If the file type is unsupported: `"Unsupported file type. Please upload a JPEG, PNG, or PDF."`

---

### Address Field
- **Fields Included**:  
  - Street Address, City, State/Province, Postal Code.
- **Optional Fields Behavior**:  
  - If left blank, placeholders will appear in the email:  
    - `"Street: No street provided"`  
    - `"City: No city provided"`  
    - `"State: No state provided"`  
    - `"Postal Code: No postal code provided"`

---

### Requester Name Field
- **Fields Included**:  
  - First Name, Last Name.
- **Optional**:  
  - If left blank, placeholders will appear in the email:  
    - `"First Name: No first name provided."`  
    - `"Last Name: No last name provided."`
- **Validation**:  
  - Only alphabetic characters allowed (no numbers or symbols).

---

### Start and End Date & Time
- **Start Date & Time**:  
  - Mandatory and selected using a date and time picker.
- **End Date & Time**:  
  - Optional, selected using a date and time picker.  
- **Validation**:  
  - End Date & Time must occur **after or equal to Start Date & Time**.  
  - If violated: `"End date and time cannot be earlier than the start date and time."`
- **Time Zone**:  
  - Fixed to **system's local timezone** (no user selection).

---

### Recurring Appointments (Free Text Field)
- **Open-Text Input**:  
  - Users can freely describe their recurring schedule (e.g., `"Every second Wednesday"`).
- **Short Guidance**:  
  - Display below the input:  
    - `"Beschreiben Sie den wiederkehrenden Termin in eigenen Worten, z. B. ‘Jeden zweiten Mittwoch’. (optional)"`
- **Long Guidance (`(?)` Button)**:
  - When clicked, show modal/tooltip:  
    ```text
    Wiederholende Termine erklären
    Wenn Ihr Termin in regelmäßigen Abständen stattfindet, können Sie dies hier beschreiben. Schreiben Sie zum Beispiel:  
    - Jeden Dienstag um 15:00 Uhr für 4 Wochen  
    - Alle zwei Wochen Mittwochmorgens  
    Wenn der Termin nicht wiederholt wird, lassen Sie dieses Feld einfach leer.
    ```
- **Optional**:  
  - Defaults to: `"Recurring Appointments: No recurring schedule specified."`

---

### CAPTCHA Protection
- **Type**: Google **reCAPTCHA v2 ("I'm not a robot")**.
- **Activation Rules**:
  - Only shown **after 3 form submissions from the same IP address in 1 hour**.
- **Error Handling**:
  - If user fails: `"Bitte bestätigen Sie, dass Sie kein Roboter sind."`

---

## Styling

### Primary and Secondary Colors
- **Primary Colors**:
  - **#FF0000 (Red)** for buttons and attention-catching elements.  
  - **#FFFFFF (White)** for form background and text on red buttons.
- **Secondary Colors** (for accents, borders, hover states):  
  - **#004B5B (Dark teal)** & **#00B19C (Bright teal)** for neutral or subtle accents.
  - **#6F003C (Dark crimson)** for error or warning messages.

---

### Button Styling
- **Submit Button**:
  - Background: **#FF0000**.
  - Text: **White**.
  - Hover: Darker Red (#C70000).

---

### Email Output

### Email Body:
- Include all fields and placeholders for missing values.
- Example:
  ```text
  Main Text: [User Input]
  Start Date & Time: [User Input]
  End Date & Time: No end date and time provided.
  Address: 
    Street: No street provided
    City: New York
    State: California
    Postal Code: No postal code provided
  Requester: 
    First Name: Jane
    Last Name: No last name provided.
  Recurring Appointments: Every second Wednesday.
  ```

---

### Attachments:
- Attach the **uploaded file** directly.  

### Image/Thumbnail Preview:
- Embed a thumbnail (200px width) for **JPEG/PNG files**.  
- For PDFs, display file name and optionally show a preview thumbnail of the first page.

---

## System Architecture

### **Technology Stack**:
- **Frontend and Backend**:  
  - **Next.js** for server-side React.
- **Email Service**:  
  - Use an email library (e.g., **Nodemailer**) to send structured emails to your configured email provider via SMTP.

---

### Storage:
- Uploaded files are stored **temporarily** on the file system or memory during the email-sending process. Files are deleted immediately afterward.

---

## Error Handling

### Frontend Validation:
- Validate required fields before submission (start date/time, text character limit, file type/size).

### Backend Validation:
- Additional checks for:  
  - Valid file types and size.  
  - Ensuring end date is after start date.

### Fallback Behavior:
- If email sending fails, temporarily save submissions for manual intervention. Notify the user:  
  `"Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut."`

---

## Testing Plan

### Functional Testing:
- Test every field for validation:
  - Character limits, formatting, and file constraints.
- Ensure email is structured and includes placeholder text for blank fields.

### Email Output Testing:
- Verify that emails:
  - Contain all fields (including placeholders).
  - Attach files correctly.
  - Display preview thumbnails properly.

---

### Performance and Security:
- Verify CAPTCHA activation after multiple submissions.
- Ensure proper MIME-type validation to prevent malicious uploads.

---

### Localization Testing:
- Confirm all texts, field labels, error messages, tooltips, and modals appear correctly translated in **German**.

---

## Future Scalability

1. **Authentication**:  
   - Option to add user accounts for pre-filling form data.
2. **Admin Panel**:
   - Adjustable settings (e.g., CAPTCHA thresholds, file size limits, supported file types).

---
