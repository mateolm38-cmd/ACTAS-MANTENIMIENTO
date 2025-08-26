// Variable global para almacenar las actas
let actas = [];

// Función para obtener las coordenadas de la firma
function getSignatureCoordinates(signaturePad) {
    const points = signaturePad.toData();
    if (points.length === 0) {
        return "No hay firma";
    }

    const coordinates = points.map(stroke => {
        return stroke.points.map(point => ({ x: point.x, y: point.y }));
    });
    
    return JSON.stringify(coordinates);
}

// Función para guardar una nueva acta en el arreglo y el localStorage
function saveActa(event) {
    event.preventDefault();

    // Validar que los campos requeridos no estén vacíos
    const entidad = document.getElementById('entidad').value;
    const actaNum = document.getElementById('actaNum').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const area = document.getElementById('area').value;
    const realizadoPor = document.getElementById('realizadoPor').value;
    const descripcion = document.getElementById('descripcion').value;
    const nombreFirma = document.getElementById('nombreFirma').value;

    if (!actaNum || !fecha || !hora || !area || !realizadoPor || !descripcion || !nombreFirma || signaturePad.isEmpty()) {
        alert("Por favor, rellena todos los campos obligatorios y firma el acta.");
        return;
    }
    
    // Obtener la URL de la firma como imagen
    const firmaDataUrl = signaturePad.toDataURL();
    
    // Obtener las coordenadas de la firma
    const firmaCoords = getSignatureCoordinates(signaturePad);
    
    // Convertir las fotos a Base64 para guardarlas en el arreglo
    const photos = [];
    const photoInputs = document.querySelectorAll('.photos-container input[type="file"]');

    const promises = Array.from(photoInputs).map(input => {
        return new Promise((resolve, reject) => {
            if (input.files.length > 0) {
                const reader = new FileReader();
                reader.onload = () => {
                    photos.push(reader.result);
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(input.files[0]);
            } else {
                resolve();
            }
        });
    });

    Promise.all(promises).then(() => {
        const nuevaActa = {
            id: Date.now(),
            entidad,
            actaNum,
            fecha,
            hora,
            area,
            realizadoPor,
            descripcion,
            participantes: document.getElementById('participantes').value,
            observacion: document.getElementById('observacion').value,
            nombreFirma,
            firma: firmaDataUrl,
            firmaCoords,
            fotos: photos.filter(photo => photo !== null), // Filtrar fotos que no se subieron
        };

        actas.push(nuevaActa);
        localStorage.setItem('actas', JSON.stringify(actas));

        // Limpiar el formulario después de guardar
        document.getElementById('actaForm').reset();
        signaturePad.clear();

        renderActas();
        alert('✅ Acta guardada con éxito!');
    }).catch(error => {
        console.error('Error al leer los archivos:', error);
        alert('Hubo un error al guardar el acta.');
    });
}

// Función para renderizar la lista de actas guardadas
function renderActas() {
    const actasList = document.getElementById('actasList');
    actasList.innerHTML = '';
    
    actas.forEach(acta => {
        const li = document.createElement('li');
        li.className = 'acta-item';
        
        const fechaHora = `${acta.fecha} - ${acta.hora}`;
        const nombreEntidad = `Entidad: ${acta.entidad}`;
        
        li.innerHTML = `
            <h3>Acta N°: ${acta.actaNum}</h3>
            <p><strong>Fecha y Hora:</strong> ${fechaHora}</p>
            <p><strong>Entidad/Área:</strong> ${nombreEntidad}</p>
            <p><strong>Realizado por:</strong> ${acta.realizadoPor}</p>
            <div class="acta-item-buttons">
                <button class="export-btn" onclick="exportSingleActa(${acta.id})">📄 Exportar</button>
                <button class="delete-btn" onclick="deleteActa(${acta.id})">🗑️ Borrar</button>
            </div>
        `;
        actasList.appendChild(li);
    });
}

// Función para eliminar un acta individual
function deleteActa(id) {
    if (confirm('¿Estás seguro de que quieres borrar esta acta?')) {
        actas = actas.filter(acta => acta.id !== id);
        localStorage.setItem('actas', JSON.stringify(actas));
        renderActas();
        alert('🗑️ Acta eliminada.');
    }
}

// Función para exportar una sola acta a PDF
function exportSingleActa(id) {
    const acta = actas.find(a => a.id === id);
    if (!acta) {
        alert('Acta no encontrada.');
        return;
    }
    
    generateActaPdf(acta);
}

// Función para exportar todas las actas a un solo PDF
function exportAllActas() {
    if (actas.length === 0) {
        alert('No hay actas guardadas para exportar.');
        return;
    }
    
    const doc = new window.jspdf.jsPDF();
    let y = 10;
    const margin = 10;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.getHeight();

    actas.forEach((acta, index) => {
        if (index > 0) {
            doc.addPage();
            y = margin;
        }
        
        doc.setFontSize(18);
        doc.text(`Acta de Mantenimiento N°: ${acta.actaNum}`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 10;
        doc.setFontSize(12);

        const fields = {
            "Entidad": acta.entidad,
            "Fecha": acta.fecha,
            "Hora": acta.hora,
            "Área": acta.area,
            "Realizado por": acta.realizadoPor,
            "Descripción de la Actividad": acta.descripcion,
            "Participantes": acta.participantes,
            "Observación": acta.observacion,
            "Nombre de quien firma": acta.nombreFirma,
        };
        
        for (const [key, value] of Object.entries(fields)) {
            if (value) {
                const text = `${key}: ${value}`;
                const splitText = doc.splitTextToSize(text, 180);
                doc.text(splitText, margin, y);
                y += splitText.length * lineHeight;
            }
        }
        
        // Agregar la firma
        if (acta.firma && acta.firma !== "data:image/png;base64,iVBORw0KGgoAAA...") {
            if (y + 50 > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text('Firma:', margin, y + 5);
            doc.addImage(acta.firma, 'PNG', margin, y + 10, 80, 40);
        }

        y += 50; // Espacio para la firma
    });

    doc.save('todas_las_actas.pdf');
    alert('✅ PDF de todas las actas generado con éxito!');
}

// Función para exportar todas las fotos a un solo PDF
function exportAllPhotos() {
    if (actas.length === 0) {
        alert('No hay fotos para exportar.');
        return;
    }
    
    const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
    let y = 10;
    const margin = 10;
    const pageHeight = doc.internal.pageSize.getHeight();

    actas.forEach(acta => {
        acta.fotos.forEach((foto, index) => {
            const img = new Image();
            img.onload = () => {
                const imgWidth = 190;
                const imgHeight = (img.height * imgWidth) / img.width;
                
                if (y + imgHeight + 20 > pageHeight) {
                    doc.addPage();
                    y = margin;
                }
                
                doc.setFontSize(12);
                doc.text(`Acta N° ${acta.actaNum} - Foto ${index + 1}`, margin, y);
                y += 5;
                
                doc.addImage(foto, 'JPEG', margin, y, imgWidth, imgHeight);
                y += imgHeight + 10; // Espacio entre fotos
            };
            img.src = foto;
        });
    });

    setTimeout(() => {
        doc.save('todas_las_fotos.pdf');
        alert('🖼️ PDF de todas las fotos generado con éxito!');
    }, 1500); // Pequeño retraso para que las imágenes se carguen
}

// Función para generar un PDF de una sola acta
function generateActaPdf(acta) {
    const doc = new window.jspdf.jsPDF();
    let y = 10;
    const margin = 10;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(18);
    doc.text(`Acta de Mantenimiento N°: ${acta.actaNum}`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(12);

    const fields = {
        "Entidad": acta.entidad,
        "Fecha": acta.fecha,
        "Hora": acta.hora,
        "Área": acta.area,
        "Realizado por": acta.realizadoPor,
        "Descripción de la Actividad": acta.descripcion,
        "Participantes": acta.participantes,
        "Observación": acta.observacion,
        "Nombre de quien firma": acta.nombreFirma,
    };
    
    for (const [key, value] of Object.entries(fields)) {
        if (value) {
            const text = `${key}: ${value}`;
            const splitText = doc.splitTextToSize(text, 180);
            doc.text(splitText, margin, y);
            y += splitText.length * lineHeight;
        }
    }
    
    // Agregar la firma
    if (acta.firma && acta.firma !== "data:image/png;base64,iVBORw0KGgoAAA...") {
        if (y + 50 > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        doc.text('Firma:', margin, y + 5);
        doc.addImage(acta.firma, 'PNG', margin, y + 10, 80, 40);
    }

    y += 50; // Espacio para la firma

    // Agregar las fotos
    if (acta.fotos.length > 0) {
        doc.text('Fotos de Evidencia:', margin, y + 10);
        y += 15;
        
        acta.fotos.forEach((photoData, index) => {
            const img = new Image();
            img.onload = () => {
                const imgWidth = 190;
                const imgHeight = (img.height * imgWidth) / img.width;

                if (y + imgHeight + 20 > pageHeight) {
                    doc.addPage();
                    y = margin;
                }

                doc.text(`Foto ${index + 1}:`, margin, y);
                y += 5;
                doc.addImage(photoData, 'JPEG', margin, y, imgWidth, imgHeight);
                y += imgHeight + 10;
            };
            img.src = photoData;
        });
    }

    setTimeout(() => {
        doc.save(`acta-${acta.actaNum}.pdf`);
    }, 1500); // Pequeño retraso para que las imágenes se carguen
}

// Configuración inicial del canvas de firma
const canvas = document.getElementById('signatureCanvas');
const signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)'
});

// Función para ajustar el tamaño del canvas
function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    signaturePad.clear();
}
window.addEventListener('resize', resizeCanvas);

// Cargar las actas guardadas al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    const savedActas = localStorage.getItem('actas');
    if (savedActas) {
        actas = JSON.parse(savedActas);
        renderActas();
    }
    resizeCanvas(); // Asegurar que el canvas tenga el tamaño correcto al cargar
});

// Asignar eventos a los botones
document.getElementById('saveActa').addEventListener('click', saveActa);
document.getElementById('clearSignature').addEventListener('click', () => signaturePad.clear());
document.getElementById('exportAllActas').addEventListener('click', exportAllActas);
document.getElementById('exportAllPhotos').addEventListener('click', exportAllPhotos);