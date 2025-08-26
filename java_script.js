// Variable global para almacenar las actas
let actas = [];

// Inicialización de jsPDF y SignaturePad
const { jsPDF } = window.jspdf;

const canvas = document.getElementById('signatureCanvas');
const signaturePad = new SignaturePad(canvas);

// Ajustar el canvas al tamaño del contenedor
function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    signaturePad.clear();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Elementos del DOM
const entidadSelect = document.getElementById('entidad');
const actaNumInput = document.getElementById('actaNum');
const fechaInput = document.getElementById('fecha');
const horaInput = document.getElementById('hora');
const areaInput = document.getElementById('area');
const realizadoPorInput = document.getElementById('realizadoPor');
const descripcionInput = document.getElementById('descripcion');
const participantesInput = document.getElementById('participantes');
const observacionInput = document.getElementById('observacion');
const nombreFirmaInput = document.getElementById('nombreFirma');
const photoInputs = [
    document.getElementById('photo1'),
    document.getElementById('photo2'),
    document.getElementById('photo3')
];
const saveActaBtn = document.getElementById('saveActa');
const clearSignatureBtn = document.getElementById('clearSignature');
const actasList = document.getElementById('actasList');
const exportAllActasBtn = document.getElementById('exportAllActas');
const exportAllPhotosBtn = document.getElementById('exportAllPhotos');

// Función auxiliar para leer un archivo como Base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

// Función para guardar un acta
async function saveActa(event) {
    event.preventDefault();

    const entidad = entidadSelect.value;
    const actaNum = actaNumInput.value;
    const fecha = fechaInput.value;
    const hora = horaInput.value;
    const area = areaInput.value;
    const realizadoPor = realizadoPorInput.value;
    const descripcion = descripcionInput.value;
    const participantes = participantesInput.value;
    const observacion = observacionInput.value;
    const nombreFirma = nombreFirmaInput.value;

    if (signaturePad.isEmpty() || !actaNum || !entidad || !fecha || !hora || !area || !realizadoPor || !descripcion || !nombreFirma) {
        alert("El número de acta, la entidad, los datos del acta y la firma son obligatorios.");
        return;
    }

    const photosBase64 = [];
    for (const input of photoInputs) {
        if (input.files.length > 0) {
            const file = input.files[0];
            photosBase64.push(await readFileAsBase64(file));
        } else {
            photosBase64.push(null);
        }
    }

    const acta = {
        id: Date.now(),
        entidad,
        actaNum,
        fecha,
        hora,
        area,
        realizadoPor,
        descripcion,
        participantes,
        observacion,
        nombreFirma,
        firma: signaturePad.toDataURL("image/png"),
        fotos: photosBase64
    };

    actas.push(acta);
    localStorage.setItem('actas', JSON.stringify(actas));

    document.getElementById('actaForm').reset();
    signaturePad.clear();
    loadActas();
    alert('Acta guardada con éxito.');
}

// Función para cargar y mostrar las actas
function loadActas() {
    const storedActas = localStorage.getItem('actas');
    if (storedActas) {
        actas = JSON.parse(storedActas);
    }
    
    actasList.innerHTML = '';
    actas.forEach(acta => {
        const li = document.createElement('li');
        li.className = 'acta-item';
        li.innerHTML = `
            <h3>Acta N°: ${acta.actaNum}</h3>
            <p><strong>Entidad:</strong> ${acta.entidad}</p>
            <p><strong>Área:</strong> ${acta.area}</p>
            <div class="acta-item-buttons">
                <button class="export-btn" data-id="${acta.id}">Exportar PDF</button>
                <button class="delete-btn" data-id="${acta.id}">Borrar</button>
            </div>
        `;
        actasList.appendChild(li);
    });
    
    document.querySelectorAll('.export-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            getActaAndExport(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            deleteActa(id);
        });
    });
}

// Función para obtener un acta por ID y exportarla a PDF
function getActaAndExport(id) {
    const acta = actas.find(a => a.id == id);
    if (acta) {
        generatePDF(acta);
    }
}

// Función para eliminar un acta
function deleteActa(id) {
    actas = actas.filter(a => a.id != id);
    localStorage.setItem('actas', JSON.stringify(actas));
    loadActas();
    alert('Acta eliminada.');
}

// Función de generación de PDF
function generatePDF(acta) {
    const doc = new jsPDF();
    let yPos = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const lineHeight = 7;

    doc.setFontSize(18);
    doc.text('Acta de Mantenimiento', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;
    doc.setFontSize(12);

    const fields = {
        "Entidad": acta.entidad,
        "Número de Acta": acta.actaNum,
        "Fecha": acta.fecha,
        "Hora": acta.hora,
        "Área": acta.area,
        "Realizado por": acta.realizadoPor,
        "Descripción de la Actividad": acta.descripcion,
        "Participantes": acta.participantes,
        "Observación": acta.observacion,
        "Nombre de quien firma": acta.nombreFirma
    };

    for (const [key, value] of Object.entries(fields)) {
        if (value) {
            const text = `${key}: ${value}`;
            const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
            doc.text(splitText, margin, yPos);
            yPos += (splitText.length * lineHeight);
        }
    }

    yPos += 15;

    // Firma
    if (acta.firma) {
        doc.text('Firma:', margin, yPos);
        yPos += 5;
        doc.addImage(acta.firma, 'PNG', margin, yPos, 80, 40);
        yPos += 50;
    }

    // Fotos de evidencia
    acta.fotos.forEach((photoData, index) => {
        if (photoData) {
            if (yPos + 80 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                yPos = 10;
            }
            doc.text(`Foto de Evidencia: ${index + 1}`, margin, yPos);
            yPos += 5;
            const imgWidth = pageWidth - margin * 2;
            doc.addImage(photoData, 'JPEG', margin, yPos, imgWidth, imgWidth * 0.75);
            yPos += imgWidth * 0.75 + 15;
        }
    });

    setTimeout(() => {
        doc.save(`acta-${acta.entidad}-${acta.actaNum}.pdf`);
    }, 1000);
}

// Función para exportar todas las actas
function exportAllActas() {
    if (actas.length === 0) {
        alert('No hay actas guardadas para exportar.');
        return;
    }

    const doc = new jsPDF();
    let yPos = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.getHeight();

    actas.forEach((acta, index) => {
        if (index > 0) {
            doc.addPage();
            yPos = 10;
        }

        doc.setFontSize(18);
        doc.text('Acta de Mantenimiento', pageWidth / 2, yPos, { align: 'center' });
        yPos += lineHeight * 2;
        doc.setFontSize(12);

        const fields = {
            "Entidad": acta.entidad,
            "Número de Acta": acta.actaNum,
            "Fecha": acta.fecha,
            "Hora": acta.hora,
            "Área": acta.area,
            "Realizado por": acta.realizadoPor,
            "Descripción de la Actividad": acta.descripcion,
            "Participantes": acta.participantes,
            "Observación": acta.observacion,
            "Nombre de quien firma": acta.nombreFirma
        };

        for (const [key, value] of Object.entries(fields)) {
            if (value) {
                const text = `${key}: ${value}`;
                const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
                doc.text(splitText, margin, yPos);
                yPos += (splitText.length * lineHeight);
            }
        }

        yPos += 15;
        if (acta.firma) {
            if (yPos + 50 > pageHeight) {
                doc.addPage();
                yPos = 10;
            }
            doc.text('Firma:', margin, yPos);
            yPos += 5;
            doc.addImage(acta.firma, 'PNG', margin, yPos, 80, 40);
            yPos += 50;
        }
    });

    setTimeout(() => {
        doc.save('Todas_las_actas.pdf');
    }, 1000);
}

// Función para exportar todas las fotos
function exportAllPhotos() {
    if (actas.length === 0) {
        alert('No hay fotos para exportar.');
        return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    let yPos = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const pageHeight = doc.internal.pageSize.getHeight();

    actas.forEach(acta => {
        acta.fotos.forEach((photoData, index) => {
            if (photoData) {
                if (yPos + 80 > pageHeight) {
                    doc.addPage();
                    yPos = 10;
                }
                doc.text(`Acta: ${acta.actaNum} - Foto ${index + 1}`, margin, yPos);
                yPos += 5;
                const imgWidth = pageWidth - margin * 2;
                doc.addImage(photoData, 'JPEG', margin, yPos, imgWidth, imgWidth * 0.75);
                yPos += imgWidth * 0.75 + 15;
            }
        });
    });

    setTimeout(() => {
        doc.save('Todas_las_fotos.pdf');
    }, 1000);
}

// Asignar eventos
document.addEventListener('DOMContentLoaded', () => {
    loadActas();
});
saveActaBtn.addEventListener('click', saveActa);
clearSignatureBtn.addEventListener('click', () => signaturePad.clear());
exportAllActasBtn.addEventListener('click', exportAllActas);
exportAllPhotosBtn.addEventListener('click', exportAllPhotos);