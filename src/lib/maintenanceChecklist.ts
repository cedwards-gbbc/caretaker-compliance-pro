export type MaintenanceFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "FOUR_MONTHLY"
  | "SIX_MONTHLY"
  | "ANNUAL"
  | "COLLECTION_DAYS"
  | "AS_REQUIRED";

export type MaintenanceItem = {
  code: string;
  service: string;
  category: string;
  frequency: MaintenanceFrequency;
  responsibleParty: "CARETAKER" | "CONTRACTOR" | "PROPERTY_MANAGER";
  evidenceRequired: boolean;
  checklist: string[];
};

export const maintenanceChecklist: MaintenanceItem[] = [
  { code:"MNT-001", service:"Pool water testing and records", category:"Pool and pool area", frequency:"DAILY", responsibleParty:"CARETAKER", evidenceRequired:true, checklist:["Test pool water","Record chlorine and pH readings","Escalate unsafe readings"] },
  { code:"MNT-002", service:"Pool area inspection and clean", category:"Pool and pool area", frequency:"WEEKLY", responsibleParty:"CARETAKER", evidenceRequired:true, checklist:["Inspect pool area","Remove debris","Check signage and gates"] },
  { code:"MNT-003", service:"Garden and lawn maintenance", category:"Gardens, lawns and grounds", frequency:"MONTHLY", responsibleParty:"CARETAKER", evidenceRequired:true, checklist:["Mow and edge lawns","Weed gardens","Report irrigation or plant issues"] },
  { code:"MNT-004", service:"Common property inspection", category:"Common property", frequency:"MONTHLY", responsibleParty:"CARETAKER", evidenceRequired:true, checklist:["Inspect common areas","Check paths, fences and lighting","Record defects"] },
  { code:"MNT-005", service:"Stormwater pipes maintenance", category:"Stormwater", frequency:"MONTHLY", responsibleParty:"CARETAKER", evidenceRequired:true, checklist:["Inspect visible stormwater assets","Check blockages or ponding","Escalate defects"] },
  { code:"MNT-006", service:"Waste and bin management", category:"Waste and bin management", frequency:"COLLECTION_DAYS", responsibleParty:"CARETAKER", evidenceRequired:false, checklist:["Place bins out","Return bins after collection","Report contamination or overflow"] },
  { code:"MNT-007", service:"Pest control services", category:"Pest control", frequency:"QUARTERLY", responsibleParty:"CONTRACTOR", evidenceRequired:true, checklist:["Arrange pest treatment","Upload contractor report","Record areas treated"] },
  { code:"MNT-008", service:"Water / Unitywater checks", category:"Utilities", frequency:"QUARTERLY", responsibleParty:"PROPERTY_MANAGER", evidenceRequired:true, checklist:["Review water usage or notices","Check abnormal usage","Record action required"] },
  { code:"MNT-009", service:"OceanGuard pit inserts", category:"Stormwater treatment", frequency:"FOUR_MONTHLY", responsibleParty:"CONTRACTOR", evidenceRequired:true, checklist:["Service 9 x OceanGuard pit inserts","Upload service report","Flag damaged inserts"] },
  { code:"MNT-010", service:"Pumps / generators / motors", category:"Mechanical services", frequency:"SIX_MONTHLY", responsibleParty:"CONTRACTOR", evidenceRequired:true, checklist:["Service pumps/generators/motors","Upload service certificate","Record faults"] },
  { code:"MNT-011", service:"Garage door maintenance", category:"Building maintenance", frequency:"SIX_MONTHLY", responsibleParty:"CONTRACTOR", evidenceRequired:true, checklist:["Inspect garage doors","Lubricate and test operation","Record repairs required"] },
  { code:"MNT-012", service:"Fire services inspection", category:"Fire safety", frequency:"ANNUAL", responsibleParty:"CONTRACTOR", evidenceRequired:true, checklist:["Complete annual fire service inspection","Upload compliance report","Escalate defects"] },
  { code:"MNT-013", service:"StormFilter system service", category:"Stormwater treatment", frequency:"ANNUAL", responsibleParty:"CONTRACTOR", evidenceRequired:true, checklist:["Service 29 x Cartridge StormFilter system","Upload contractor report","Record cartridge issues"] },
  { code:"MNT-014", service:"Plumbing maintenance", category:"Plumbing", frequency:"ANNUAL", responsibleParty:"CONTRACTOR", evidenceRequired:true, checklist:["Inspect common plumbing assets","Upload report","Record repair recommendations"] },
  { code:"MNT-015", service:"Building defects, repairs and maintenance", category:"Defects and repairs", frequency:"AS_REQUIRED", responsibleParty:"CARETAKER", evidenceRequired:true, checklist:["Record defect","Add photos","Escalate quote or repair requirement"] }
];

export function frequencyLabel(f: MaintenanceFrequency) {
  return {
    DAILY:"Daily",
    WEEKLY:"Weekly",
    MONTHLY:"Monthly",
    QUARTERLY:"Quarterly",
    FOUR_MONTHLY:"4 monthly",
    SIX_MONTHLY:"6 monthly",
    ANNUAL:"Annual",
    COLLECTION_DAYS:"Collection days",
    AS_REQUIRED:"As required"
  }[f];
}
