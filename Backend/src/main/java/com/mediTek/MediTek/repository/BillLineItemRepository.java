package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.BillLineItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillLineItemRepository extends JpaRepository<BillLineItem, String> {
    List<BillLineItem> findByBill_BillIdOrderByLineItemId(String billId);
    long countByBill_BillId(String billId);
}
