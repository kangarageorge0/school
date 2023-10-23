import * as XLSX from 'xlsx';
async function readNamedRange(filePath, sheetName, rangeName) {
    try {
        const workbook = await XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        if (!worksheet[rangeName]) {
            throw new Error(`Named range "${rangeName}" not found in the worksheet "${sheetName}"`);
        }
        const namedRange = XLSX.utils.decode_range(worksheet[rangeName].ref);
        const values = [];
        for (let row = namedRange.s.r; row <= namedRange.e.r; row++) {
            const rowValues = [];
            for (let col = namedRange.s.c; col <= namedRange.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cellValue = worksheet[cellAddress] ? worksheet[cellAddress].v : undefined;
                rowValues.push(cellValue);
            }
            values.push(rowValues);
        }
        return values;
    }
    catch (error) {
        throw new Error(`Error reading named range: ${error.message}`);
    }
}
// Example usage:
const filePath = 'example.xlsx'; // Replace this with the path to your Excel file
const sheetName = 'Sheet1'; // Replace this with the name of the sheet
const rangeName = 'MyNamedRange'; // Replace this with the name of your named range
readNamedRange(filePath, sheetName, rangeName)
    .then((values) => {
    console.log('Values in the named range:');
    console.log(values);
})
    .catch((error) => {
    console.error(error);
});
