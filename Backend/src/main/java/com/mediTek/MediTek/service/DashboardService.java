package com.mediTek.MediTek.service;

import com.mediTek.MediTek.dto.DashboardStatsDto;
import java.util.List;
import java.util.Map;

public interface DashboardService {
    DashboardStatsDto getDashboardStats();
    List<Map<String, Object>> getPatientChartData();
}

