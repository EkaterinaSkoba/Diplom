package ru.sberhack2025.companyevents.participant.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import ru.sberhack2025.companyevents.common.formatter.DateFormatter;

import java.time.Instant;
import java.util.UUID;

/**
 * @author Andrey Kurnosov
 */
@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ParticipantView implements DateFormatter {

    @Schema(description = "Participant id (uuid)", example = "faf063f0-50d9-4251-89dd-be1487f73b9c")
    UUID id;

    @Schema(description = "Participant name", example = "Masha")
    String name;

    @Schema(description = "True if organizer transfer money to participant", example = "true")
    Boolean hasPayment;

    @Schema(description = "Participant telegram user id", example = "433566788")
    Long tgUserId;

    @Schema(description = "User creation time", example = "2024-07-14T11:12:13Z", format = INSTANT_PATTERN)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = INSTANT_PATTERN, timezone = "UTC")
    Instant createdAt;

}
