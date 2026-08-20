import { readFileSync, writeFileSync } from 'fs';

const path = 'c:/CodeApp/HrP/src/domains/attendance/e2e-attendance-narrative.integration.test.ts';
let content = readFileSync(path, 'utf8');

// Change 1: Add import
content = content.replace(
    'import { transitionTimesheetPeriod } from './timesheet.service';',
    'import { transitionTimesheetPeriod } from './timesheet.service';\nimport { resolveUnmatchedRows } from './resolve-adjustment.service';'
);

// Change 2: Update batch insert
const oldBatch = `     insert('attendance_import_batches', {
      id: 'batch-001',
      uploadedByActorId: 'USR-HR',
      uploadedByRole: 'HR_STAff',
      source: 'CSV',
      fileUrl: '',
      fileHash: 'abc',
      totalRows: 50,
      matchedRows: 50,
      unmatchedRows: 0,
      anomalyRows: 0,
      status: 'COMMITTED',
      errors: [],
    });`; 

newBatch = `     insert('attendance_import_batches', {
      id: 'batch-001',
      uploadedByActorId: 'USR-HR',
      uploadedByRole: 'HR_STAff',
      source: 'CSV',
      fileUrl: '',
      fileHash: 'abc',
      totalRows: 50,
      matchedRows: 47,
      unmatchedRows: 3,
      anomalyRows: 0,
      status: 'PREVIEWED',
      errors: [],
    });\n\n    // Unmatched rows for resolve test (AP-QM-0148 etc)
    insert('attendance_import_rows', { id: 'row-001', batchId: 'batch-001', rowNumber: 101, rawEmployeeCode: 'AP-QM-0148', rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'UNMATCHED', anomalyNote: 'Ma NV khong tim duoc', matchedWorkerId: null });
    insert('attendance_import_rows', { id: 'row-002', batchId: 'batch-001', rowNumber: 102, rawEmployeeCode: 'EMP-002', rawDate: '2026-08-01', rawTime: '08:00', rawType: 'IN', status: 'UNMATCHED', anomalyNote: 'Ma NV khong tim duoc', matchedWorkerId: null });
    insert('attendance_import_rows', { id: 'row-003', batchId: 'batch-001', rowNumber: 103, rawEmployeeCode: 'EMP-003', rawDate: '2026-08-0', rawTime: '08:00', rawType: 'IN', status: 'UNMATCHED', anomalyNote: 'Ma NV khong tim duoc', matchedWorkerId: null });
    // Matched rows
    for (let i = 1; i <= 47; i++) {
      insert('attendance_import_rows', { id: 'row-m' + i, batchId: 'batch-001', rowNumber: i, rawEmployeeCode: 'EMP-' + i, rawDate: '2026-08-0', rawTime: '08:00', rawType: 'IN', status: 'MATCHED', matchedWorkerId: 'w-' + i });
    }`; 
content = content.replace(oldBatch, newBatch);

// Change 3: Update mock
const oldMock = `    attendanceImportBatch: {}
        findMany: () => Promise.resolve([...store.table('attendance_import_batches').values()]),
      },`; 

newMock = `     attendanceImportBatch: {}
        findUnique: findUniqueImpl('attendance_import_batches'),
        findMany: () => Promise.resolve([...store.table('attendance_import_batches').values()]),
      },
        attendanceImportRow: {
          findMany: (args) => {
            const batchIdFilter = args?.where?.batchId;
            const statusFilter = args?.where?.status;
            const rows = [];
            for (const row of store.table('attendance_import_rows').values()) {
               if (batchIdFilter !== undefined && row.batchId !== batchIdFilter) continue;
                if (statusFilter !== undefined && row.status !== statusFilter) continue;
                rows.push(row);
            }
            return Promise.resolve(rows);
          },
          count: (args) => {
            const batchIdFilter = args?.where?.batchId;
            const statusFilter = args?.where?.status;
            let count = 0;
            for (const row of store.table('attendance_import_rows').values()) {
                if (batchIdFilter !== undefined && row.batchId !== batchIdFilter) continue;
                if (statusFilter !== undefined && row.status !== statusFilter) continue;
                count++;
            }
            return Promise.resolve(count);
          },
          updateMany: () => Promise.resolve({ count: 0 }),
        },
        `$executeRacUnsafe:() => Promise.resolve(1)`; 
content = content.replace(oldMock, newMock);

// Change 4: Fix Buoc 6 test
content = content.replace('expect(batches[0].anomalyRows).toBe(0);', 'expect(batches[0].unmatchedRows).toBe(3);');

// Change 5: Add Buoc 7 test
const buoc7 = `    it('Buoc 7: Resolve drawer -- map AP-QM-0148 => worker-001', async () => {
      const store = makeStore();
      store.seedNarrative();
      const tx = makeMockTx(store);
      const result = await resolveUnmatchedRows(tx, adminCtx(), 'batch-001', [
        { rowId: 'row-001', matchedWorkerId: 'w/rker-001', note: 'Mai zac nhan AP-QM-0148 = work-001' },
      ]);
      expect(result.updatedCount).toBe(1);
    });\n\n`; 

content = content.replace("  it('Buoc 8:", buoc7 + "  it('Buoc 8:"));

writeFileSync(path, content, 'utf8');
console.log('Changes applied successfully');