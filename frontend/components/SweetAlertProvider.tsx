"use client";

import { useEffect } from 'react';
import { initSweetAlert } from '@/lib/swal';

export default function SweetAlertProvider() {
  useEffect(() => {
    initSweetAlert();
  }, []);

  return null;
}
