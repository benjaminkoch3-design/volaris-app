// src/utils/fitExporter.ts
import { Workout, WorkoutStep } from "../types";

// Calculateur de CRC FIT standard
const calculateCRC = (data: Uint8Array, start = 0, end = data.length): number => {
  const crcTable = [
    0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
    0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
  ];
  let crc = 0;
  for (let i = start; i < end; i++) {
    const byte = data[i];
    let tmp = crcTable[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ crcTable[byte & 0xf];
    tmp = crcTable[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ crcTable[(byte >> 4) & 0xf];
  }
  return crc;
};

// Convertit la durée ou distance en unités Garmin FIT
const parseStepValue = (val: string): { durationType: number; value: number } => {
  const clean = (val || "").toLowerCase().trim();
  if (clean.includes("min")) {
    const mins = parseFloat(clean) || 0;
    return { durationType: 0, value: Math.round(mins * 60 * 1000) }; // Temps en ms
  }
  if (clean.includes("km")) {
    const km = parseFloat(clean) || 0;
    return { durationType: 1, value: Math.round(km * 1000 * 100) }; // Distance en cm
  }
  if (clean.includes("m")) {
    const m = parseFloat(clean) || 0;
    return { durationType: 1, value: Math.round(m * 100) }; // Distance en cm
  }
  return { durationType: 0, value: 300 * 1000 }; // 5 min par défaut
};

export const exportWorkoutToFIT = async (workout: Workout) => {
  try {
    const steps: { name: string; durationType: number; value: number; intensity: number }[] = [];

    if (workout.steps && workout.steps.length > 0) {
      workout.steps.forEach((step) => {
        if (step.type === "repeat" && step.nestedSteps) {
          const reps = step.reps || 1;
          for (let i = 0; i < reps; i++) {
            step.nestedSteps.forEach((nStep, nIdx) => {
              const parsed = parseStepValue(nStep.durationOrDist || "");
              steps.push({
                name: `R${i + 1}-${nIdx + 1}`,
                durationType: parsed.durationType,
                value: parsed.value,
                intensity: nStep.type === "recup" ? 1 : 0, // 0 = Active, 1 = Rest
              });
            });
          }
        } else {
          const parsed = parseStepValue(step.durationOrDist || "");
          steps.push({
            name: `Etape ${steps.length + 1}`,
            durationType: parsed.durationType,
            value: parsed.value,
            intensity: step.type === "recup" ? 1 : 0,
          });
        }
      });
    } else {
      const distKm = parseFloat(workout.km || "8") || 8;
      steps.push({
        name: "Course",
        durationType: 1,
        value: Math.round(distKm * 1000 * 100),
        intensity: 0,
      });
    }

    const cleanTitle = (workout.title || "Entrainement")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/gi, "")
      .trim()
      .substring(0, 15);

    // Construction du binaire FIT (Header 14 octets + Records)
    const records: number[] = [];

    // 1. Définition FILE_ID (MesgNum 0)
    records.push(
      0x40, 0x00, 0x00, 0x00, 0x00, 0x04,
      0x00, 0x01, 0x00, // type (enum)
      0x01, 0x02, 0x84, // manufacturer (uint16)
      0x02, 0x02, 0x84, // product (uint16)
      0x04, 0x04, 0x86  // time_created (uint32)
    );
    // Données FILE_ID
    const nowGarminSec = Math.round((Date.now() - 631065600000) / 1000); // Base Garmin 1989
    records.push(
      0x00,
      0x05, // FileType = Workout (5)
      0x01, 0x00, // Garmin (1)
      0x00, 0x00, // Product (0)
      nowGarminSec & 0xff, (nowGarminSec >> 8) & 0xff, (nowGarminSec >> 16) & 0xff, (nowGarminSec >> 24) & 0xff
    );

    // 2. Définition WORKOUT (MesgNum 26)
    records.push(
      0x41, 0x00, 0x00, 0x1a, 0x00, 0x03,
      0x04, 0x01, 0x00, // sport (enum)
      0x06, 0x02, 0x84, // num_valid_steps (uint16)
      0x08, 0x10, 0x07  // wkt_name (string 16 bytes)
    );
    // Données WORKOUT
    const titleBytes = new Array(16).fill(0);
    for (let i = 0; i < Math.min(cleanTitle.length, 15); i++) {
      titleBytes[i] = cleanTitle.charCodeAt(i);
    }
    records.push(
      0x01,
      0x01, // Sport = Running (1)
      steps.length & 0xff, (steps.length >> 8) & 0xff,
      ...titleBytes
    );

    // 3. Définition WORKOUT_STEP (MesgNum 27)
    records.push(
      0x42, 0x00, 0x00, 0x1b, 0x00, 0x05,
      0xfe, 0x02, 0x84, // message_index (uint16)
      0x00, 0x10, 0x07, // wkt_step_name (string 16 bytes)
      0x01, 0x01, 0x00, // duration_type (enum)
      0x02, 0x04, 0x86, // duration_value (uint32)
      0x05, 0x01, 0x00  // intensity (enum)
    );

    // Données des étapes
    steps.forEach((st, idx) => {
      const stepNameBytes = new Array(16).fill(0);
      for (let i = 0; i < Math.min(st.name.length, 15); i++) {
        stepNameBytes[i] = st.name.charCodeAt(i);
      }
      records.push(
        0x02,
        idx & 0xff, (idx >> 8) & 0xff,
        ...stepNameBytes,
        st.durationType & 0xff,
        st.value & 0xff, (st.value >> 8) & 0xff, (st.value >> 16) & 0xff, (st.value >> 24) & 0xff,
        st.intensity & 0xff
      );
    });

    // En-tête global FIT (14 octets)
    const dataSize = records.length;
    const header = [
      14,           // Header size
      0x20,         // Protocol version 2.0
      0x20, 0x08,   // Profile version 20.80
      dataSize & 0xff, (dataSize >> 8) & 0xff, (dataSize >> 16) & 0xff, (dataSize >> 24) & 0xff,
      0x2e, 0x46, 0x49, 0x54 // ".FIT"
    ];
    const headerCrc = calculateCRC(new Uint8Array(header));
    header.push(headerCrc & 0xff, (headerCrc >> 8) & 0xff);

    const fullPayload = new Uint8Array([...header, ...records]);
    const fileCrc = calculateCRC(fullPayload, 14, fullPayload.length);
    const finalBuffer = new Uint8Array([...fullPayload, fileCrc & 0xff, (fileCrc >> 8) & 0xff]);

    const fileName = `Volaris_${cleanTitle.replace(/\s+/g, "_")}.fit`;
    const file = new File([finalBuffer], fileName, { type: "application/octet-stream" });

    // 1. Essai de partage mobile si supporté
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Séance Volaris : ${workout.title}`,
          text: `Séance d'entraînement`,
          files: [file],
        });
        return;
      } catch {
        // En cas d'annulation du partage, on bascule sur le téléchargement classique
      }
    }

    // 2. Téléchargement standard direct du fichier
    const blob = new Blob([finalBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err: any) {
    alert("Erreur lors de la génération du fichier : " + (err?.message || err));
  }
};