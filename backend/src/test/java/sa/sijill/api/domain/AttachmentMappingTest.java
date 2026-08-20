package sa.sijill.api.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import org.junit.jupiter.api.Test;

class AttachmentMappingTest {

    @Test
    void uploaderDoesNotReintroduceTheEmployeeAttachmentCycle() throws Exception {
        ManyToOne mapping = Attachment.class.getDeclaredField("uploadedBy").getAnnotation(ManyToOne.class);

        assertEquals(FetchType.LAZY, mapping.fetch());
    }
}
