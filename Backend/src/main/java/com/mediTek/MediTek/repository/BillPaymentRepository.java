package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.BillPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BillPaymentRepository extends JpaRepository<BillPayment, String> {
    List<BillPayment> findByBill_BillIdOrderByPaidAt(String billId);
    boolean existsByPaymentRequestId(String paymentRequestId);

    @Query("SELECT COALESCE(SUM(bp.amount), 0.0) FROM BillPayment bp")
    Double calculateTotalRevenue();

    @Query("SELECT COALESCE(SUM(bp.amount), 0.0) FROM BillPayment bp WHERE bp.bill.patient.personId = :personId")
    Double calculatePatientPaidTotal(@Param("personId") String personId);
}
