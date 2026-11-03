package com.mediTek.MediTek.service;

import com.mediTek.MediTek.domain.BloodUnit;
import com.mediTek.MediTek.dto.*;

import java.util.List;

public interface BloodBankService {
    List<BloodBankDto> getBloodBanks();

    BloodBankDto createBloodBank(BloodBankCreateRequest request);

    List<BloodUnitDto> getBloodUnits(String bloodType, BloodUnit.BloodComponent component, String search);

    BloodUnitDto receiveBloodUnit(BloodUnitCreateRequest request);

    List<BloodIssueDto> getBloodIssues();

    BloodIssueDto issueBlood(BloodIssueCreateRequest request);
}
