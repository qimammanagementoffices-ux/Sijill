package sa.sijill.api.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import sa.sijill.api.domain.BackupTrigger;

@Component
public class BackupScheduler {

    private final BackupService backupService;

    public BackupScheduler(BackupService backupService) {
        this.backupService = backupService;
    }

    @Scheduled(cron = "0 0 2 * * *")
    public void runDailyBackup() {
        backupService.runBackup(BackupTrigger.SCHEDULED);
    }
}
