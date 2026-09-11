import PDFDocument from 'pdfkit';

export interface FeeReceiptData {
  receiptNo: string;
  paymentDate: string;
  monthLabel: string;
  amount: number;
  method: string;
  upiProvider?: string | null;
  transactionRef?: string | null;
  studentName: string;
  studentPhone?: string | null;
  rollNumber?: string | null;
  course?: string | null;
  roomName?: string | null;
  bedNumber?: number | null;
  hostelName?: string;
  hostelPhone?: string;
  hostelEmail?: string;
  hostelAddress?: string;
}

/**
 * Generates an official Hostel Fee Payment Receipt PDF in memory as a Buffer
 */
export function generateFeeReceiptPDFBuffer(data: FeeReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const hostelTitle = data.hostelName || 'VMR HOSTEL';
      const hostelAddress = data.hostelAddress || 'Main Campus Road, City Center';
      const hostelContact = `Phone: ${data.hostelPhone || '+91 98765 43210'} | Email: ${data.hostelEmail || 'contact@vmrhostel.com'}`;

      // Primary Color Palette
      const primaryColor = '#1e3a8a';   // Deep Blue
      const secondaryColor = '#047857'; // Success Green
      const darkText = '#1f2937';
      const lightBg = '#f3f4f6';
      const borderColor = '#e5e7eb';

      // Header Banner
      doc.rect(40, 40, 515, 80).fill(primaryColor);

      doc
        .fillColor('#ffffff')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(hostelTitle.toUpperCase(), 55, 52, { width: 485, align: 'center' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(hostelAddress, 55, 78, { width: 485, align: 'center' })
        .text(hostelContact, 55, 93, { width: 485, align: 'center' });

      // Title Sub-header
      doc
        .fillColor(darkText)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('FEE PAYMENT RECEIPT', 40, 135, { align: 'center' });

      doc
        .strokeColor(primaryColor)
        .lineWidth(2)
        .moveTo(40, 155)
        .lineTo(555, 155)
        .stroke();

      // Receipt Metadata Box
      doc.rect(40, 165, 515, 45).fillAndStroke(lightBg, borderColor);

      doc
        .fillColor(darkText)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('RECEIPT NO:', 55, 175)
        .font('Helvetica')
        .text(data.receiptNo, 135, 175)
        .font('Helvetica-Bold')
        .text('DATE:', 380, 175)
        .font('Helvetica')
        .text(data.paymentDate, 425, 175);

      doc
        .font('Helvetica-Bold')
        .text('STATUS:', 55, 193)
        .fillColor(secondaryColor)
        .text('PAID (COMPLETED)', 135, 193)
        .fillColor(darkText)
        .font('Helvetica-Bold')
        .text('MONTH:', 380, 193)
        .font('Helvetica')
        .text(data.monthLabel, 435, 193);

      // Student Info Section
      doc
        .fillColor(primaryColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('STUDENT INFORMATION', 40, 225);

      doc.rect(40, 240, 515, 75).fillAndStroke('#ffffff', borderColor);

      const roomBedStr = data.roomName
        ? `Room ${data.roomName}${data.bedNumber ? ` (Bed ${data.bedNumber})` : ''}`
        : 'Unallocated';

      doc
        .fillColor(darkText)
        .fontSize(10)
        .font('Helvetica-Bold').text('Student Name:', 55, 250)
        .font('Helvetica').text(data.studentName, 145, 250)
        .font('Helvetica-Bold').text('Room / Bed:', 330, 250)
        .font('Helvetica').text(roomBedStr, 415, 250);

      doc
        .font('Helvetica-Bold').text('Phone Number:', 55, 270)
        .font('Helvetica').text(data.studentPhone || 'N/A', 145, 270)
        .font('Helvetica-Bold').text('Course/Year:', 330, 270)
        .font('Helvetica').text(data.course || 'N/A', 415, 270);

      doc
        .font('Helvetica-Bold').text('Roll Number:', 55, 290)
        .font('Helvetica').text(data.rollNumber || 'N/A', 145, 290);

      // Fee Breakdown Section
      doc
        .fillColor(primaryColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PAYMENT BREAKDOWN', 40, 330);

      // Table Header
      doc.rect(40, 345, 515, 24).fill(primaryColor);
      doc
        .fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', 55, 352)
        .text('Billing Cycle', 280, 352)
        .text('Amount Paid (₹)', 440, 352, { align: 'right', width: 100 });

      // Table Row 1
      doc.rect(40, 369, 515, 30).fillAndStroke('#ffffff', borderColor);
      doc
        .fillColor(darkText)
        .font('Helvetica')
        .text('Hostel Accommodation & Maintenance Fee', 55, 378)
        .text(data.monthLabel, 280, 378)
        .font('Helvetica-Bold')
        .text(`₹${data.amount.toLocaleString('en-IN')}`, 440, 378, { align: 'right', width: 100 });

      // Total Row
      doc.rect(40, 399, 515, 30).fillAndStroke(lightBg, borderColor);
      doc
        .fillColor(darkText)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Total Amount Received', 55, 408)
        .fillColor(secondaryColor)
        .text(`₹${data.amount.toLocaleString('en-IN')}`, 440, 408, { align: 'right', width: 100 });

      // Payment Details Section
      doc
        .fillColor(primaryColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PAYMENT MODE & TRANSACTION REFERENCE', 40, 445);

      doc.rect(40, 460, 515, 55).fillAndStroke('#ffffff', borderColor);

      const methodStr = data.upiProvider ? `${data.method} (${data.upiProvider})` : data.method;

      doc
        .fillColor(darkText)
        .fontSize(10)
        .font('Helvetica-Bold').text('Payment Method:', 55, 472)
        .font('Helvetica').text(methodStr, 160, 472);

      doc
        .font('Helvetica-Bold').text('Transaction Ref / ID:', 55, 492)
        .font('Helvetica').text(data.transactionRef || 'N/A (Cash Received)', 160, 492);

      // Terms & Authorized Signatures
      doc
        .fillColor('#6b7280')
        .fontSize(8)
        .font('Helvetica')
        .text('This is a computer-generated digital payment receipt issued by Hostel Management Office.', 40, 535)
        .text('For queries regarding this receipt, please present receipt number to the hostel administration.', 40, 547);

      // Signature Box
      doc
        .strokeColor(borderColor)
        .lineWidth(1)
        .moveTo(380, 570)
        .lineTo(540, 570)
        .stroke();

      doc
        .fillColor(darkText)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Authorized Signatory', 380, 575, { width: 160, align: 'center' })
        .fontSize(8)
        .font('Helvetica')
        .text(hostelTitle, 380, 587, { width: 160, align: 'center' });

      // Green Success Badge Top Right
      doc.rect(460, 48, 80, 24).fill(secondaryColor);
      doc
        .fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('VERIFIED', 460, 55, { width: 80, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
