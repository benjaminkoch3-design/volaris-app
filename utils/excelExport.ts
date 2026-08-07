// src/utils/excelExport.ts

import ExcelJS from 'exceljs';
import { CompletedRun } from '../types';

const MONTHS_FRENCH = [
  'JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'
];

const MONTH_COLORS: Record<number, { header: string; light: string }> = {
  0: { header: 'C084FC', light: 'F3E8FF' }, // Janvier (Violet)
  1: { header: 'A78BFA', light: 'EDE9FE' }, // Février (Indigo)
  2: { header: '93C5FD', light: 'EFF6FF' }, // Mars (Bleu)
  3: { header: 'A5F3FC', light: 'ECFEFF' }, // Avril (Cyan)
  4: { header: '6EE7B7', light: 'ECFDF5' }, // Mai (Vert menthe)
  5: { header: 'A3E635', light: 'F7FEE7' }, // Juin (Lime)
  6: { header: 'FDE047', light: 'FEFCE8' }, // Juillet (Jaune)
  7: { header: 'FDBA74', light: 'FFF7ED' }, // Août (Ambre)
  8: { header: 'FB923C', light: 'FFEDD5' }, // Septembre (Orange)
  9: { header: 'F87171', light: 'FEF2F2' }, // Octobre (Rouge)
  10: { header: 'F472B6', light: 'FDF2F8' }, // Novembre (Rose)
  11: { header: 'E879F9', light: 'FDF4FF' }, // Décembre (Magenta)
};

export const exportAthleteStatsToExcel = async (
  completedRuns: CompletedRun[],
  athleteName: string = 'Athlète',
  year: number = 2026
) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(`Tableaux année ${year}`);

  ws.views = [{ showGridLines: true }];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'D4D4D8' } },
    left: { style: 'thin', color: { argb: 'D4D4D8' } },
    bottom: { style: 'thin', color: { argb: 'D4D4D8' } },
    right: { style: 'thin', color: { argb: 'D4D4D8' } },
  };

  // 1. Titre principal
  ws.mergeCells('B2:R2');
  const titleCell = ws.getCell('B2');
  titleCell.value = `ANNEE ${year}`;
  titleCell.font = { name: 'Poppins', size: 16, bold: true, color: { argb: '18181B' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E4E4E7' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Grand Bilan Général
  ws.getCell('I4').value = 'Distance (km)';
  ws.getCell('J4').value = 'Temps (h)';
  ws.getCell('K4').value = 'Dénivelé (m)';
  ws.getCell('L4').value = 'Sorties (nb)';

  ['I4', 'J4', 'K4', 'L4'].forEach((c) => {
    const cell = ws.getCell(c);
    cell.font = { name: 'Poppins', size: 9, bold: true, color: { argb: '71717A' } };
    cell.alignment = { horizontal: 'center' };
  });

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInYear = isLeapYear ? 366 : 365;

  const summaryRows = [
    { 
      label: 'TOTAL', 
      formula: [
        'C19+I19+O19+C30+I30+O30+C41+I41+O41+C52+I52+O52', 
        'D19+J19+P19+D30+J30+P30+D41+J41+P41+D52+J52+P52', 
        'E19+K19+Q19+E30+K30+Q30+E41+K41+Q41+E52+K52+Q52', 
        'F19+L19+R19+F30+L30+R30+F41+L41+R41+F52+L52+R52'
      ], 
      bg: 'F4F4F5', 
      bold: true 
    },
    { label: 'Moy / sortie', formula: ['I5/L5', 'J5/L5', 'K5/L5', ''], bg: 'FFFFFF', bold: false },
    { label: 'Moy / jour', formula: [`I5/${daysInYear}`, `J5/${daysInYear}`, `K5/${daysInYear}`, `L5/${daysInYear}`], bg: 'FFFFFF', bold: false },
    { label: 'Moy / semaine', formula: ['I5/52', 'J5/52', 'K5/52', 'L5/52'], bg: 'FFFFFF', bold: false },
    { label: 'Moy / mois', formula: ['I5/12', 'J5/12', 'K5/12', 'L5/12'], bg: 'FFFFFF', bold: false },
  ];

  summaryRows.forEach((s, idx) => {
    const rNum = 5 + idx;
    const labelCell = ws.getCell(`H${rNum}`);
    labelCell.value = s.label;
    labelCell.font = { name: 'Poppins', size: 9, bold: true, color: { argb: '18181B' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.bg } };
    labelCell.border = thinBorder;

    ['I', 'J', 'K', 'L'].forEach((col, cIdx) => {
      const cell = ws.getCell(`${col}${rNum}`);
      if (s.formula[cIdx]) {
        cell.value = { formula: s.formula[cIdx] };
      }
      cell.font = { name: 'Poppins', size: 9, bold: s.bold };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.bg } };
      cell.alignment = { horizontal: 'center' };
      cell.border = thinBorder;
      cell.numFmt = col === 'L' ? '0' : '0.00';
    });
  });

  // 3. Helper pour déterminer le numéro de semaine ISO
  const getISOWeek = (dateStrOrObj: Date | string) => {
    const parts = typeof dateStrOrObj === 'string' ? dateStrOrObj.split('-').map(Number) : null;
    const y = parts ? parts[0] : (dateStrOrObj as Date).getFullYear();
    const m = parts ? parts[1] - 1 : (dateStrOrObj as Date).getMonth();
    const day = parts ? parts[2] : (dateStrOrObj as Date).getDate();

    const d = new Date(Date.UTC(y, m, day));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  // Filtrage général par année
  const yearRuns = completedRuns.filter((r) => {
    const y = parseInt(r.date.split('-')[0], 10);
    return y === year;
  });

  // Obtenir la liste exacte des semaines présentes dans un mois
  const getMonthWeeks = (monthIndex: number) => {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);

    const startW = getISOWeek(firstDay);
    const endW = getISOWeek(lastDay);

    const weeks: number[] = [];
    if (endW < startW) {
      for (let w = startW; w <= 52; w++) weeks.push(w);
      weeks.push(1);
    } else {
      for (let w = startW; w <= endW; w++) weeks.push(w);
    }
    return weeks;
  };

  // 4. Disposition des 12 blocs mensuels
  const monthLayout = [
    { startRow: 12, months: [0, 1, 2], cols: [['B', 'C', 'D', 'E', 'F'], ['H', 'I', 'J', 'K', 'L'], ['N', 'O', 'P', 'Q', 'R']] },
    { startRow: 23, months: [3, 4, 5], cols: [['B', 'C', 'D', 'E', 'F'], ['H', 'I', 'J', 'K', 'L'], ['N', 'O', 'P', 'Q', 'R']] },
    { startRow: 34, months: [6, 7, 8], cols: [['B', 'C', 'D', 'E', 'F'], ['H', 'I', 'J', 'K', 'L'], ['N', 'O', 'P', 'Q', 'R']] },
    { startRow: 45, months: [9, 10, 11], cols: [['B', 'C', 'D', 'E', 'F'], ['H', 'I', 'J', 'K', 'L'], ['N', 'O', 'P', 'Q', 'R']] },
  ];

  monthLayout.forEach((block) => {
    block.months.forEach((mIdx, mOffset) => {
      const [colWeek, colKm, colH, colElev, colCount] = block.cols[mOffset];
      const mColors = MONTH_COLORS[mIdx];
      const weeks = getMonthWeeks(mIdx);

      // Nom du mois
      ws.mergeCells(`${colWeek}${block.startRow}:${colCount}${block.startRow}`);
      const mTitleCell = ws.getCell(`${colWeek}${block.startRow}`);
      mTitleCell.value = MONTHS_FRENCH[mIdx];
      mTitleCell.font = { name: 'Poppins', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      mTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mColors.header } };
      mTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Sous-titres colonnes
      const headers = ['S', 'Distance (km)', 'Temps (h)', 'Dénivelé (m)', 'Sorties (nb)'];
      [colWeek, colKm, colH, colElev, colCount].forEach((c, idx) => {
        const cell = ws.getCell(`${c}${block.startRow + 1}`);
        cell.value = headers[idx];
        cell.font = { name: 'Poppins', size: 8, bold: true, color: { argb: '3F3F46' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mColors.light } };
        cell.alignment = { horizontal: 'center' };
        cell.border = thinBorder;
      });

      // Remplissage des 5 lignes de semaines
      for (let i = 0; i < 5; i++) {
        const rowNum = block.startRow + 2 + i;
        const wNum = weeks[i];

        const cellW = ws.getCell(`${colWeek}${rowNum}`);
        cellW.value = wNum ? `S${wNum}` : '-';
        cellW.font = { name: 'Poppins', size: 8, bold: true, color: { argb: '71717A' } };
        cellW.alignment = { horizontal: 'center' };
        cellW.border = thinBorder;

        // Semaines chevauchantes (gris clair)
        const isFirstWeekIncomplete = i === 0 && new Date(year, mIdx, 1).getDay() !== 1;
        const isLastWeekIncomplete = i === weeks.length - 1 && new Date(year, mIdx + 1, 0).getDay() !== 0;

        if (isFirstWeekIncomplete || isLastWeekIncomplete || !wNum) {
          cellW.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E4E4E7' } };
        } else {
          cellW.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mColors.light } };
        }

        // 🎯 RÈGLE STRICTE : Ne sommer QUE les sorties qui ont eu lieu dans le mois (mIdx) ET la semaine (wNum)
        let kmSum = 0, hSum = 0, elevSum = 0, countRun = 0;
        if (wNum) {
          yearRuns.forEach((r) => {
            const parts = r.date.split('-').map(Number);
            const rMonth = parts[1] - 1; // 0 à 11
            
            // Condition 1 : La sortie doit être dans CE mois-ci (ex: Janvier)
            // Condition 2 : La sortie doit appartenir à CETTE semaine ISO (ex: S5)
            if (rMonth === mIdx && getISOWeek(r.date) === wNum) {
              kmSum += r.km;
              hSum += r.durationHours;
              elevSum += r.elevation || 0;
              countRun += 1;
            }
          });
        }

        [
          { col: colKm, val: kmSum, fmt: '0.00' },
          { col: colH, val: hSum, fmt: '0.00' },
          { col: colElev, val: elevSum, fmt: '0' },
          { col: colCount, val: countRun, fmt: '0' },
        ].forEach((item) => {
          const cell = ws.getCell(`${item.col}${rowNum}`);
          cell.value = item.val > 0 ? item.val : null;
          cell.font = { name: 'Poppins', size: 8 };
          cell.alignment = { horizontal: 'center' };
          cell.border = thinBorder;
          cell.numFmt = item.fmt;
        });
      }

      // TOTAL DU MOIS
      const totRow = block.startRow + 7;
      const totalCellLabel = ws.getCell(`${colWeek}${totRow}`);
      totalCellLabel.value = 'TOTAL';
      totalCellLabel.font = { name: 'Poppins', size: 8, bold: true, color: { argb: mColors.header } };
      totalCellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mColors.light } };
      totalCellLabel.alignment = { horizontal: 'center' };
      totalCellLabel.border = thinBorder;

      [colKm, colH, colElev, colCount].forEach((c) => {
        const cell = ws.getCell(`${c}${totRow}`);
        const rStart = block.startRow + 2;
        const rEnd = block.startRow + 6;
        cell.value = { formula: `SUM(${c}${rStart}:${c}${rEnd})` };
        cell.font = { name: 'Poppins', size: 8, bold: true, color: { argb: mColors.header } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mColors.light } };
        cell.alignment = { horizontal: 'center' };
        cell.border = thinBorder;
      });
    });
  });

  ws.columns = [
    { width: 3 }, { width: 8 }, { width: 14 }, { width: 11 }, { width: 13 }, { width: 11 },
    { width: 3 }, { width: 8 }, { width: 14 }, { width: 11 }, { width: 13 }, { width: 11 },
    { width: 3 }, { width: 8 }, { width: 14 }, { width: 11 }, { width: 13 }, { width: 11 },
  ];

  workbook.calcProperties.fullCalcOnLoad = true;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Evolution_Course_A_Pied_${athleteName}_${year}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};