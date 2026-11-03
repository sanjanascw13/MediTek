package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.AppointmentDto;
import java.util.List;

public interface AppointmentService {
    AppointmentDto scheduleAppointment(AppointmentDto dto);
    List<AppointmentDto> getAllAppointments();
    AppointmentDto updateStatus(String id, String status);
}

