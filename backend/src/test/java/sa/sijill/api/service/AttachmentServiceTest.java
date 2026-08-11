package sa.sijill.api.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.repository.AttachmentRepository;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTest {

    @Mock private AttachmentRepository attachmentRepository;
    @Mock private StorageService storageService;

    private AttachmentService attachmentService;

    @BeforeEach
    void setUp() {
        attachmentService = new AttachmentService(attachmentRepository, storageService);
    }

    @Test
    void deleteChecksDatabaseReferencesBeforeRemovingStoredObject() {
        UUID id = UUID.randomUUID();
        Attachment attachment = new Attachment();
        attachment.setStorageKey("employee/photo.png");
        when(attachmentRepository.findById(id)).thenReturn(Optional.of(attachment));

        attachmentService.delete(id);

        InOrder order = inOrder(attachmentRepository, storageService);
        order.verify(attachmentRepository).delete(attachment);
        order.verify(attachmentRepository).flush();
        order.verify(storageService).delete("employee/photo.png");
    }

    @Test
    void deleteKeepsStoredObjectWhenDatabaseStillReferencesAttachment() {
        UUID id = UUID.randomUUID();
        Attachment attachment = new Attachment();
        attachment.setStorageKey("employee/photo.png");
        when(attachmentRepository.findById(id)).thenReturn(Optional.of(attachment));
        doThrow(new DataIntegrityViolationException("still referenced")).when(attachmentRepository).flush();

        assertThrows(DataIntegrityViolationException.class, () -> attachmentService.delete(id));

        verify(storageService, never()).delete("employee/photo.png");
    }
}
