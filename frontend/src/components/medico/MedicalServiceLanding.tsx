'use client';

import { useState } from 'react';
import UrgentRequestModal from './UrgentRequestModal';
import UrgentHomeCareCard from './UrgentHomeCareCard';
import SymptomsInfo from './symptoms-info';

export default function MedicalServiceLanding() {
  const [showUrgentModal, setShowUrgentModal] = useState(false);

  return (
    <div className="space-y-8">
      <UrgentHomeCareCard onRequestUrgent={() => setShowUrgentModal(true)} />

      <SymptomsInfo />

      <UrgentRequestModal isOpen={showUrgentModal} onClose={() => setShowUrgentModal(false)} />
    </div>
  );
}
