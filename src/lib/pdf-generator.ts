import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import { getInvoice, getClients } from './fs-db'

const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function inWords(numValue: number): string {
    let numStr = Math.floor(numValue).toString().replace(/[\, ]/g, '');
    let n = ("000000000" + numStr).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    var str = '';
    str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0] as any] + ' ' + a[n[1][1] as any]) + 'CRORE ' : '';
    str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'LAKH ' : '';
    str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'THOUSAND ' : '';
    str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'HUNDRED ' : '';
    str += (Number(n[5]) != 0) ? ((str != '') ? 'AND ' : '') + (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) : '';
    return str.trim() === '' ? 'ZERO' : str.trim();
}

function formatAmountToWords(amount: number): string {
    const dhs = Math.floor(amount);
    const fils = Math.round((amount - dhs) * 100);
    const dhsWords = inWords(dhs);
    const filsWords = inWords(fils);

    if (fils === 0) return `${dhsWords} DHS AND ZERO FILS`;
    return `${dhsWords} DHS AND ${filsWords} FILS`;
}

export async function generateInvoicePdf(id: string): Promise<Uint8Array | null> {
    const invoice = await getInvoice(id)
    if (!invoice) return null

    // Fetch client contact info
    const clients = await getClients()
    const client = clients.find(c => c.name.toLowerCase() === invoice.client_name.toLowerCase())

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 portrait
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const { width, height } = page.getSize()

    const drawText = (text: string, x: number, y: number, size: number, f: PDFFont, color = rgb(0, 0, 0)) => {
        page.drawText(text, { x, y, size, font: f, color })
    }

    // --- Top Branding Accent ---
    page.drawRectangle({
        x: 0,
        y: height - 8,
        width: width,
        height: 8,
        color: rgb(0.05, 0.05, 0.05)
    })

    // --- Header Left: Company Info ---
    let yLeft = height - 130 // giving space for the logo area
    drawText('BIZNET BUSINESSMEN SERVICES', 40, yLeft, 16, fontBold)
    const companyAddress = [
        'AL AIN, SANAYIA, UAE',
        'Mob: +971 568304427'
    ]
    yLeft -= 18
    companyAddress.forEach(line => {
        let isBoldLine = line.startsWith('Tel:') || line.startsWith('Mob:') || line.startsWith('Email:')
        if (isBoldLine) {
            const splitIndex = line.indexOf(': ') + 2
            const label = line.substring(0, splitIndex)
            const val = line.substring(splitIndex)
            drawText(label, 40, yLeft, 10, fontBold)
            const labelWidth = fontBold.widthOfTextAtSize(label, 10)
            drawText(val, 40 + labelWidth, yLeft, 10, font)
        } else {
            drawText(line, 40, yLeft, 10, font, rgb(0.3, 0.3, 0.3))
        }
        yLeft -= 14
    })

    // --- Header Right: INVOICE title ---
    const rightMargin = width - 40
    const titleText = 'INVOICE'
    const titleWidth = fontBold.widthOfTextAtSize(titleText, 28)
    drawText(titleText, rightMargin - titleWidth, height - 75, 28, fontBold)

    // Invoice Meta
    let yRight = height - 120
    const metaLines = [
        { label: 'Invoice #:', value: invoice.invoice_number },
        { label: 'Generated on:', value: new Date(invoice.created_at || invoice.date).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) },
        { label: 'Created By:', value: 'Admin' }
    ]

    metaLines.forEach(line => {
        const valWidth = font.widthOfTextAtSize(line.value, 10)
        const labelText = `${line.label} `
        const labelWidth = fontBold.widthOfTextAtSize(labelText, 10)
        drawText(line.value, rightMargin - valWidth, yRight, 10, font)
        drawText(labelText, rightMargin - valWidth - labelWidth, yRight, 10, fontBold)
        yRight -= 14
    })

    yRight -= 10 // Space before billing info

    // Billing Info (Right Aligned in block)
    const billingTitle = 'Billing to'
    const billingWidth = fontBold.widthOfTextAtSize(billingTitle, 10)
    drawText(billingTitle, rightMargin - billingWidth, yRight, 10, fontBold)
    yRight -= 15

    const clientNameStr = invoice.client_name.toUpperCase()
    const clientNameWidth = fontBold.widthOfTextAtSize(clientNameStr, 12)
    drawText(clientNameStr, rightMargin - clientNameWidth, yRight, 12, fontBold)
    yRight -= 16

    // Show mobile if available
    if (client?.mobile) {
        const mobLabel = 'Mob: '
        const mobVal = client.mobile
        const mobLabelWidth = fontBold.widthOfTextAtSize(mobLabel, 9)
        const mobValWidth = font.widthOfTextAtSize(mobVal, 9)
        const mobTotalWidth = mobLabelWidth + mobValWidth
        drawText(mobLabel, rightMargin - mobTotalWidth, yRight, 9, fontBold)
        drawText(mobVal, rightMargin - mobValWidth, yRight, 9, font)
        yRight -= 13
    }

    // Show email if available
    if (client?.email) {
        const emailStr = client.email
        const emailWidth = font.widthOfTextAtSize(emailStr, 9)
        drawText(emailStr, rightMargin - emailWidth, yRight, 9, font)
        yRight -= 13
    }

    yRight -= 5

    // --- Table ---
    let yTable = height - 340

    const colX = {
        num: 45,
        service: 70,
        desc: 200,
        qty: 395, // Center
        fees: 485, // Right
        total: 555  // Right
    }

    // Table Header Background
    page.drawRectangle({
        x: 40,
        y: yTable,
        width: width - 80,
        height: 25,
        color: rgb(0.05, 0.05, 0.05)
    })

    const tY = yTable + 8
    const headerColor = rgb(1, 1, 1)
    drawText('#', colX.num, tY, 10, fontBold, headerColor)
    drawText('Service', colX.service, tY, 10, fontBold, headerColor)
    drawText('Description', colX.desc, tY, 10, fontBold, headerColor)
    
    // Centered header
    const qtyWidth = fontBold.widthOfTextAtSize('Qty', 10)
    drawText('Qty', colX.qty - (qtyWidth / 2), tY, 10, fontBold, headerColor)
    
    // Right headers
    const feesWidth = fontBold.widthOfTextAtSize('Fees (AED)', 10)
    drawText('Fees (AED)', colX.fees - feesWidth, tY, 10, fontBold, headerColor)
    
    const totalWidth = fontBold.widthOfTextAtSize('Total (AED)', 10)
    drawText('Total (AED)', colX.total - totalWidth, tY, 10, fontBold, headerColor)

    let yRow = yTable - 20

    // Rows
    const drawRow = (idx: number, service: string, desc: string, qty: number, rate: number, total: number) => {
        const rowHeight = 25
        const isEven = idx % 2 === 0
        
        if (isEven) {
            page.drawRectangle({
                x: 40,
                y: yRow - 5,
                width: width - 80,
                height: rowHeight,
                color: rgb(0.98, 0.98, 0.98)
            })
        }

        const rowY = yRow + 5
        drawText(idx.toString(), colX.num + 2, rowY, 10, font)
        drawText(service, colX.service, rowY, 10, fontBold)
        drawText(desc, colX.desc, rowY, 9, font, rgb(0.4, 0.4, 0.4))
        
        // Center Qty
        const qStr = qty.toString()
        const qW = font.widthOfTextAtSize(qStr, 10)
        drawText(qStr, colX.qty - (qW / 2), rowY, 10, font)
        
        // Right align Fees
        const fStr = rate.toFixed(2)
        const fW = font.widthOfTextAtSize(fStr, 10)
        drawText(fStr, colX.fees - fW, rowY, 10, font)
        
        // Right align Total
        const tStr = total.toFixed(2)
        const tW = fontBold.widthOfTextAtSize(tStr, 10)
        drawText(tStr, colX.total - tW, rowY, 10, fontBold)

        // Subtle bottom border
        page.drawLine({
            start: { x: 40, y: yRow - 5 },
            end: { x: width - 40, y: yRow - 5 },
            thickness: 0.3,
            color: rgb(0.9, 0.9, 0.9)
        })

        yRow -= rowHeight
    }

    if (invoice.line_items && invoice.line_items.length > 0) {
        invoice.line_items.forEach((item, idx) => {
            drawRow(idx + 1, item.name, item.description || '', item.qty, item.rate, item.total)
        })
    } else {
        const serviceTitle = 'Professional Services'
        const serviceDesc = invoice.invoice_description || `Services - ${invoice.client_name}`
        drawRow(1, serviceTitle, serviceDesc, 1, invoice.amount, invoice.amount)
    }

    // Totals Background Lines
    // Add gray background to totals lines
    page.drawRectangle({
        x: 40,
        y: yRow - 20,
        width: width - 80,
        height: 25,
        color: rgb(0.95, 0.95, 0.95)
    })

    const itemCount = invoice.line_items?.length || 1
    drawText('Total', colX.desc, yRow - 12, 10, font)
    
    const countStr = itemCount.toString()
    const countW = font.widthOfTextAtSize(countStr, 10)
    drawText(countStr, colX.qty - (countW / 2), yRow - 12, 10, font)
    
    const grandFStr = invoice.amount.toFixed(2)
    const grandFW = font.widthOfTextAtSize(grandFStr, 10)
    drawText(grandFStr, colX.fees - grandFW, yRow - 12, 10, font)
    
    const grandTStr = invoice.amount.toFixed(2)
    const grandTW = fontBold.widthOfTextAtSize(grandTStr, 10)
    drawText(grandTStr, colX.total - grandTW, yRow - 12, 10, fontBold)
    
    yRow -= 55 // move down past the total background

    // Grand Total
    const labelX = 400
    const valueX = colX.total

    drawText('Grand Total (AED)', labelX - 20, yRow, 11, fontBold)
    const totalValStr = invoice.amount.toFixed(2)
    const totalValW = fontBold.widthOfTextAtSize(totalValStr, 11)
    drawText(totalValStr, valueX - totalValW, yRow, 11, fontBold)
    yRow -= 22

    page.drawLine({ start: { x: labelX - 20, y: yRow + 10 }, end: { x: width - 40, y: yRow + 10 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })

    drawText('Paid (AED)', labelX - 20, yRow, 10, font, rgb(0.4, 0.4, 0.4))
    const paidStr = invoice.paid.toFixed(2)
    const paidW = font.widthOfTextAtSize(paidStr, 10)
    drawText(paidStr, valueX - paidW, yRow, 10, font)
    yRow -= 20

    page.drawLine({ start: { x: labelX - 20, y: yRow + 10 }, end: { x: width - 40, y: yRow + 10 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) })

    drawText('Amount Due (AED)', labelX - 20, yRow, 10, fontBold, rgb(0.7, 0.1, 0.1))
    const dueStr = invoice.amount_due.toFixed(2)
    const dueW = fontBold.widthOfTextAtSize(dueStr, 10)
    drawText(dueStr, valueX - dueW, yRow, 10, fontBold, rgb(0.7, 0.1, 0.1))
    yRow -= 25

    // Amount in words
    page.drawRectangle({
        x: 40,
        y: yRow - 5,
        width: width - 80,
        height: 20,
        color: rgb(0.92, 0.92, 0.92)
    })
    drawText('In Words:', 45, yRow, 10, font)
    drawText(formatAmountToWords(invoice.amount), 150, yRow, 10, fontBold)

    // --- Footer Section ---
    const footerY = 100
    page.drawLine({ start: { x: 40, y: footerY }, end: { x: width - 40, y: footerY }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })

    // Thank you message
    drawText('Thank you for your business!', 40, footerY - 25, 10, font, rgb(0.4, 0.4, 0.4))
    drawText('Should you have any enquiries concerning this invoice, please contact us.', 40, footerY - 40, 8, font, rgb(0.5, 0.5, 0.5))

    
    // Draw Inv number at bottom right for filing
    const footerNumStr = `Reference: ${invoice.invoice_number}`
    const footerNumWidth = font.widthOfTextAtSize(footerNumStr, 7)
    drawText(footerNumStr, width - 40 - footerNumWidth, 25, 7, font, rgb(0.6, 0.6, 0.6))

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
}
