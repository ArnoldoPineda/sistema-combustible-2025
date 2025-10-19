export default function ExportarPDF({ evaluacion }) {
  
  const generarReporte = () => {
    const ventana = window.open('', '_blank');
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte Evaluación TEACH - ${evaluacion.docentes?.nombre_completo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            background: white;
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .header h1 { 
            color: #2563eb; 
            font-size: 28px; 
            margin-bottom: 10px; 
          }
          .header h2 { 
            color: #64748b; 
            font-size: 18px; 
            font-weight: normal; 
          }
          .seccion { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
          }
          .seccion-titulo { 
            background: #f1f5f9; 
            padding: 12px; 
            font-size: 18px; 
            font-weight: bold; 
            color: #1e293b; 
            border-left: 4px solid #2563eb; 
            margin-bottom: 15px; 
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 20px; 
          }
          .info-item { 
            padding: 12px; 
            background: #f8fafc; 
            border-radius: 6px; 
          }
          .info-label { 
            font-size: 12px; 
            color: #64748b; 
            text-transform: uppercase; 
            margin-bottom: 5px; 
          }
          .info-value { 
            font-size: 16px; 
            color: #1e293b; 
            font-weight: bold; 
          }
          .puntajes-principales { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 15px; 
            margin: 20px 0; 
          }
          .puntaje-card { 
            text-align: center; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          }
          .puntaje-card.ambiente { background: #dbeafe; border: 2px solid #3b82f6; }
          .puntaje-card.instruccion { background: #d1fae5; border: 2px solid #10b981; }
          .puntaje-card.socioemocional { background: #e9d5ff; border: 2px solid #8b5cf6; }
          .puntaje-card.global { background: #fed7aa; border: 2px solid #f97316; }
          .puntaje-label { 
            font-size: 12px; 
            color: #475569; 
            margin-bottom: 8px; 
            font-weight: 600; 
          }
          .puntaje-valor { 
            font-size: 36px; 
            font-weight: bold; 
          }
          .puntaje-card.ambiente .puntaje-valor { color: #2563eb; }
          .puntaje-card.instruccion .puntaje-valor { color: #059669; }
          .puntaje-card.socioemocional .puntaje-valor { color: #7c3aed; }
          .puntaje-card.global .puntaje-valor { color: #ea580c; }
          .subdimensiones { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 12px; 
            margin-top: 20px; 
          }
          .subdimension { 
            padding: 12px; 
            border-radius: 6px; 
            background: #f8fafc; 
            border-left: 3px solid #64748b; 
          }
          .subdimension.ambiente { border-left-color: #3b82f6; }
          .subdimension.instruccion { border-left-color: #10b981; }
          .subdimension.socioemocional { border-left-color: #8b5cf6; }
          .subdimension-nombre { 
            font-size: 11px; 
            color: #475569; 
            margin-bottom: 5px; 
          }
          .subdimension-puntaje { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1e293b; 
          }
          .interpretacion { 
            background: #f0f9ff; 
            padding: 20px; 
            border-left: 4px solid #0ea5e9; 
            margin: 20px 0; 
            border-radius: 6px; 
          }
          .interpretacion-titulo { 
            font-size: 16px; 
            font-weight: bold; 
            color: #0c4a6e; 
            margin-bottom: 10px; 
          }
          .interpretacion-texto { 
            color: #334155; 
            line-height: 1.6; 
          }
          .observaciones { 
            background: #fffbeb; 
            padding: 20px; 
            border-radius: 6px; 
            margin: 20px 0; 
          }
          .observaciones-titulo { 
            font-size: 16px; 
            font-weight: bold; 
            color: #92400e; 
            margin-bottom: 10px; 
          }
          .observaciones-texto { 
            color: #451a03; 
            line-height: 1.6; 
          }
          .footer { 
            margin-top: 50px; 
            padding-top: 20px; 
            border-top: 2px solid #e2e8f0; 
            text-align: center; 
            font-size: 12px; 
            color: #64748b; 
          }
          .leyenda { 
            background: #fef3c7; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 20px 0; 
            font-size: 13px; 
          }
          .leyenda-titulo { 
            font-weight: bold; 
            color: #92400e; 
            margin-bottom: 8px; 
          }
          @media print {
            body { padding: 20px; }
            .puntajes-principales { page-break-inside: avoid; }
            .subdimensiones { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <!-- HEADER -->
        <div class="header">
          <h1>🇭🇳 REPORTE DE EVALUACIÓN TEACH</h1>
          <h2>Sistema de Evaluación Docente - Honduras</h2>
        </div>

        <!-- INFORMACIÓN DEL DOCENTE -->
        <div class="seccion">
          <div class="seccion-titulo">📋 Información del Docente</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nombre Completo</div>
              <div class="info-value">${evaluacion.docentes?.nombre_completo || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Código Docente</div>
              <div class="info-value">${evaluacion.docentes?.codigo_docente || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Centro Educativo</div>
              <div class="info-value">${evaluacion.docentes?.nombre_centro || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Departamento</div>
              <div class="info-value">${evaluacion.docentes?.departamento || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha de Evaluación</div>
              <div class="info-value">${new Date(evaluacion.fecha_evaluacion).toLocaleDateString('es-HN')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Nivel/Grado</div>
              <div class="info-value">${evaluacion.nivel_grado || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Materia</div>
              <div class="info-value">${evaluacion.materia || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Formato de Clase</div>
              <div class="info-value">${evaluacion.formato_clase || 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- PUNTAJES PRINCIPALES -->
        <div class="seccion">
          <div class="seccion-titulo">📊 Puntajes por Dimensión</div>
          <div class="puntajes-principales">
            <div class="puntaje-card ambiente">
              <div class="puntaje-label">AMBIENTE DEL AULA</div>
              <div class="puntaje-valor">${(evaluacion.puntaje_ambiente || 0).toFixed(2)}</div>
            </div>
            <div class="puntaje-card instruccion">
              <div class="puntaje-label">INSTRUCCIÓN</div>
              <div class="puntaje-valor">${(evaluacion.puntaje_instruccion || 0).toFixed(2)}</div>
            </div>
            <div class="puntaje-card socioemocional">
              <div class="puntaje-label">SOCIOEMOCIONAL</div>
              <div class="puntaje-valor">${(evaluacion.puntaje_socioemocional || 0).toFixed(2)}</div>
            </div>
            <div class="puntaje-card global">
              <div class="puntaje-label">PUNTAJE GLOBAL</div>
              <div class="puntaje-valor">${(evaluacion.puntaje_global || 0).toFixed(2)}</div>
            </div>
          </div>

          <!-- Leyenda -->
          <div class="leyenda">
            <div class="leyenda-titulo">📌 Escala de Interpretación:</div>
            <strong>2.5 - 3.0:</strong> Alto desempeño<br>
            <strong>2.0 - 2.4:</strong> Desempeño medio<br>
            <strong>0.0 - 1.9:</strong> Requiere mejora
          </div>
        </div>

        <!-- INTERPRETACIÓN -->
        <div class="interpretacion">
          <div class="interpretacion-titulo">💡 Interpretación de Resultados</div>
          <div class="interpretacion-texto">
            ${evaluacion.puntaje_global >= 2.5 
              ? 'El docente demuestra un <strong>alto nivel de desempeño</strong> en las prácticas de enseñanza evaluadas. Se observa una implementación efectiva de estrategias pedagógicas que favorecen el aprendizaje de los estudiantes.' 
              : evaluacion.puntaje_global >= 2.0 
              ? 'El docente muestra un <strong>desempeño medio</strong> en las dimensiones evaluadas. Existen fortalezas que pueden potenciarse y áreas específicas que requieren atención para mejorar la calidad de la enseñanza.' 
              : 'Los resultados indican que el docente <strong>requiere apoyo y formación adicional</strong> en varias dimensiones de la práctica pedagógica. Se recomienda desarrollar un plan de mejora enfocado en las áreas de menor puntuación.'}
          </div>
        </div>

        <!-- SUBDIMENSIONES -->
        <div class="seccion">
          <div class="seccion-titulo">🎯 Puntajes por Subdimensión</div>
          <div class="subdimensiones">
            <div class="subdimension ambiente">
              <div class="subdimension-nombre">A1: Trato Respetuoso</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_a1 || 0).toFixed(2)}</div>
            </div>
            <div class="subdimension ambiente">
              <div class="subdimension-nombre">A2: Manejo del Comportamiento</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_a2 || 0).toFixed(2)}</div>
            </div>
            <div class="subdimension instruccion">
              <div class="subdimension-nombre">B3: Facilitación del Aprendizaje</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_b3 || 0).toFixed(2)}</div>
            </div>
            <div class="subdimension instruccion">
              <div class="subdimension-nombre">B4: Avance en la Lección</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_b4 || 0).toFixed(2)}</div>
            </div>
            <div class="subdimension instruccion">
              <div class="subdimension-nombre">B5: Retroalimentación</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_b5 || 0).toFixed(2)}</div>
            </div>
            <div class="subdimension instruccion">
              <div class="subdimension-nombre">B6: Pensamiento Crítico</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_b6 || 0).toFixed(2)}</div>
            </div>
            <div class="subdimension socioemocional">
              <div class="subdimension-nombre">C7: Autonomía</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_c7 || 0).toFixed(2)}</div>
            </div>
            <div class="subdimension socioemocional">
              <div class="subdimension-nombre">C8: Perseverancia</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_c8 || 0).toFixed(2)}</div>
            </div>
            <div class="subdimension socioemocional">
              <div class="subdimension-nombre">C9: Habilidades Sociales</div>
              <div class="subdimension-puntaje">${(evaluacion.puntaje_c9 || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <!-- OBSERVACIONES -->
        ${evaluacion.observaciones ? `
        <div class="observaciones">
          <div class="observaciones-titulo">📝 Observaciones del Evaluador</div>
          <div class="observaciones-texto">${evaluacion.observaciones}</div>
        </div>
        ` : ''}

        <!-- FOOTER -->
        <div class="footer">
          <p><strong>Sistema TEACH Honduras</strong></p>
          <p>Documento generado el ${new Date().toLocaleDateString('es-HN')} a las ${new Date().toLocaleTimeString('es-HN')}</p>
          <p style="margin-top: 10px; color: #94a3b8;">Este documento es de carácter confidencial y está destinado exclusivamente para fines de desarrollo profesional docente.</p>
        </div>
      </body>
      </html>
    `;
    
    ventana.document.write(html);
    ventana.document.close();
    
    // Dar tiempo para que cargue el contenido antes de mostrar el diálogo de impresión
    setTimeout(() => {
      ventana.print();
    }, 500);
  };

  return (
    <button
      onClick={generarReporte}
      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
    >
      📄 Exportar como PDF
    </button>
  );
}