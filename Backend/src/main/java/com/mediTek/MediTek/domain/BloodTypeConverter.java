package com.mediTek.MediTek.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class BloodTypeConverter implements AttributeConverter<BloodType, String> {

    @Override
    public String convertToDatabaseColumn(BloodType bloodType) {
        return bloodType == null ? null : bloodType.databaseValue();
    }

    @Override
    public BloodType convertToEntityAttribute(String value) {
        return value == null ? null : BloodType.fromDatabaseValue(value);
    }
}
