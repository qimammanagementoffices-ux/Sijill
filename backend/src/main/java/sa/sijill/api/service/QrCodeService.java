package sa.sijill.api.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// Encodes a URL built from the asset's public token (never the asset id or
// asset number, per docs/decision-record.md D2) as a downloadable/printable
// PNG for QR labels.
@Service
public class QrCodeService {

    private final String frontendOrigin;

    public QrCodeService(@Value("${app.frontend-origin}") String frontendOrigin) {
        this.frontendOrigin = frontendOrigin;
    }

    public byte[] generateAssetQrPng(UUID publicToken, int sizePx) {
        String url = frontendOrigin + "/public/assets/" + publicToken;
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(url, BarcodeFormat.QR_CODE, sizePx, sizePx);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("Failed to generate QR code", e);
        }
    }
}
