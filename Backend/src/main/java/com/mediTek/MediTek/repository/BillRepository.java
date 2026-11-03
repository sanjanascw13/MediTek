package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Bill;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, String> {
    List<Bill> findByPatient_PersonId(String personId);
    List<Bill> findByStatus(Bill.BillStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select bill from Bill bill where bill.billId = :billId")
    java.util.Optional<Bill> findByIdForUpdate(@Param("billId") String billId);

    @Query("SELECT COALESCE(SUM(b.amountTotal - b.amountPaid), 0.0) FROM Bill b WHERE b.status <> com.mediTek.MediTek.domain.Bill.BillStatus.CANCELLED")
    Double calculateTotalOutstandingBalance();

    @Query("SELECT COALESCE(SUM(b.amountTotal - b.amountPaid), 0.0) FROM Bill b WHERE b.patient.personId = :personId AND b.status <> com.mediTek.MediTek.domain.Bill.BillStatus.CANCELLED")
    Double calculatePatientOutstandingBalance(@Param("personId") String personId);
}
