package ru.sberhack2025.telegrambot.services.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserDto {

    private Long tgUserId;

    private String name;

}
