"use client";
import { useTransition } from "react";
import { updateIntervention } from "@/app/coordinator/interventions/actions";
import { useTranslation } from "@/lib/i18n/locale-provider";
export function InterventionStatusForm({id,status,outcome}:{id:string;status:string;outcome:string|null}){const{t}=useTranslation();const[pending,startTransition]=useTransition();const next=status==='completed'?'open':'completed';return <button type="button" disabled={pending} onClick={()=>startTransition(()=>{void updateIntervention(id,next,outcome??'')})} className="text-xs font-medium text-primary-600 disabled:opacity-50">{pending?t("coordinator.interventionStatusForm.saving"):status==='completed'?t("coordinator.interventionStatusForm.reopen"):t("coordinator.interventionStatusForm.markCompleted")}</button>}
