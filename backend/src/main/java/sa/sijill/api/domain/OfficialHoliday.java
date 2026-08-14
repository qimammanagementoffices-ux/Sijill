package sa.sijill.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "official_holiday")
@Getter
@Setter
@NoArgsConstructor
public class OfficialHoliday {

    @Id
    @Column(name = "holiday_date", nullable = false)
    private LocalDate date;

    @Column(name = "name", length = 200)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public OfficialHoliday(LocalDate date, String name) {
        this.date = date;
        this.name = name;
        this.createdAt = Instant.now();
    }
}
