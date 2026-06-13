'use server';

import { generateObject } from 'ai';
import { model } from '@/lib/ai';
import { FileAnalysisSchema } from '@/lib/prompts/schemas/file-analysis-schema';
import { FILE_ANALYSIS_PROMPT } from '@/lib/prompts/actions/file-analyst';
import { getErrorMessage } from '@/lib/utils';

export async function analyzeBrandFile(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'No se ha proporcionado ningún archivo.' };
        }

        const buffer = await file.arrayBuffer();
        const fileType = file.type;
        const fileName = file.name;

        // Validar tipos permitidos
        const allowedTypes = [
            'text/plain',
            'text/markdown',
            'application/pdf',
            'application/octet-stream' // A veces .md se sube así
        ];

        const isAllowed = allowedTypes.includes(fileType) ||
            fileName.endsWith('.md') ||
            fileName.endsWith('.txt') ||
            fileName.endsWith('.pdf');

        if (!isAllowed) {
            return { success: false, error: 'Formato de archivo no permitido. Solo se aceptan .txt, .md y .pdf' };
        }

        // Preparar la llamada a la IA
        // Si es PDF, lo enviamos como parte del mensaje. Si es texto, lo enviamos como string.
        let fileContent: any;

        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            fileContent = {
                type: 'file',
                data: Buffer.from(buffer),
                mimeType: 'application/pdf'
            };
        } else {
            fileContent = new TextDecoder().decode(buffer);
        }

        const { object } = await generateObject({
            model: model,
            schema: FileAnalysisSchema,
            system: FILE_ANALYSIS_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Analiza el siguiente archivo para extraer el ADN de la marca:' },
                        typeof fileContent === 'string'
                            ? { type: 'text', text: fileContent }
                            : { type: 'file', data: fileContent.data, mimeType: fileContent.mimeType } as any
                    ]
                }
            ]
        });

        return { success: true, data: object };

    } catch (error) {
        console.error('Error en analyzeBrandFile:', error);
        return { success: false, error: getErrorMessage(error) || 'Error al analizar el archivo.' };
    }
}
