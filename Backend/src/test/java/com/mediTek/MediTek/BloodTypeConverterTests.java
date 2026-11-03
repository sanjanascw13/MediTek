package com.mediTek.MediTek;

import com.mediTek.MediTek.domain.BloodType;
import com.mediTek.MediTek.domain.BloodTypeConverter;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BloodTypeConverterTests {

    @Test
    void convertsExactlyTheBloodTypesSupportedByTheMysqlEnum() {
        BloodTypeConverter converter = new BloodTypeConverter();
        String[] databaseValues = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"};

        for (String value : databaseValues) {
            BloodType bloodType = BloodType.fromDatabaseValue(value);

            assertEquals(value, converter.convertToDatabaseColumn(bloodType));
            assertEquals(bloodType, converter.convertToEntityAttribute(value));
        }
    }
}
