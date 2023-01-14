const axios = require("axios");
const fs = require('fs');
const { TextEncoder } = require('util');
const path = require('path')
const atob = require("atob");
const FormData = require('form-data');

///////////////////// VARIAVEIS QUE PRECISAM SER MODIFICADAS  /////////////////////////

// TOKEN DE ACESSO AO BRY FRAMEWORK, GERADO NO BRY-CLOUD.
const authorization = '<TOKEN_DE_ACESSO>'

// CHAVE DE AUTORIZAÇÃO (PIN) DO USUÁRIO SIGNATÁRIO CODIFICADA NO FORMATO BASE64.
const kms_credencial = '<KMS_CREEDNCIEAL>';

// TIPO DA CREDENCIAL FORNECIDA. ATUALMENTE HÁ SUPORTE PARA O FORMATO “PIN”.
const kms_credencial_tipo = 'PIN';

//URL PARA A QUAL SERÁ ENVIADA A REQUISIÇÃO POST.
const url = "https://diploma.hom.bry.com.br/api/xml-signature-service/v1/signatures/kms";

// TIPO DE RETORNO, SE RETURNTYPE FOI CONFIGURADO PARA BASE64, É RETORNADO UM ARRAY COM AS ASSINATURAS CODIFICADAS EM BASAE64. 
// SE RETURNTYPE FOI DEFINIDO COMO LINK, É RETORNADO O SEGUINTE JSON:
// identificador: Identificador do lote.
// quantidadeAssinaturas: Quantidade total de assinaturas realizadas no lote.
// documentos: Array de documentos assinados.
//      hash: Hash do documento. É o seu identificador único.
//      links: Array com link, seguindo o princípio HATEOAS.
//          rel: “self” (representa uma auto referência do objeto em questão)
//          href: URL (Define o identificador único do recurso)
const returnType = 'LINK'

class AssinaXMLs {

    async assinaXMLDiplomado(req, res) {

        const formData = new FormData();
        
        //Tipo de assinante enviado pelo front-end (será usado no switch-case para diferentes tipos de assinantes do diploma) 
        const tipoAssinatura = req.body.tipoAssinatura;
        const signerKMS = req.body.signerKMS;
        const uuid = req.body.uuid;
        const documento = req.file;

        if (req.signerKMS != null) {
            // CPF DO ASSINANTE  QUE SERÁ USADO PARA SELEDO CERTIFICADO
            formData.append('signerKMS', signerKMS);
        } else {
            // UUID DO ASSINANTE  QUE SERÁ USADO PARA VALIDAÇÃO DO CERTIFICADO
            formData.append('uuid', uuid);
        }

        // NONCE DA REQUISIÇÃO. NONCE É UM NÚMERO QUALQUER PARA IDENTIFICAÇÃO E CONTROLE DA REQUISIÇÃO.
        formData.append('nonce', '1');

        // FORMATO DE ASSINATURA * DEIXAR SEMPRE 'ENVELOPED' *
        formData.append('signatureFormat', 'ENVELOPED');

        // ALGORITMO HASH * DEIXAR SEMPRE 'SHA256' *
        formData.append('hashAlgorithm', 'SHA256');


        formData.append('returnType', returnType);

        // Abaixo estão os parâmetros que devem ser configurados n vezes em caso de assinatura em lote. 
        // Cada posição do array pode conter uma configuração diferente. 
        // Se não for lote, basta configurar n = 0.

        // NONCE DO DOCUMENTO NA REQUISIÇÃO. NONCE É UM NÚMERO QUALQUER PARA IDENTIFICAÇÃO E CONTROLE DA REQUISIÇÃO.
        formData.append('originalDocuments[0][nonce]', '1');

        // DIPLOMA QUE DEVE SER ASSINADO, DEVE SER ADICIONADO O CAMINHO ATÉ O DIPLOMA, NESTE EXEMPLO O CAMINHO É PEGO ATRAVÉS DO FRONT-END DO EXEMPLO
        formData.append('originalDocuments[0][content]', fs.createReadStream(path.resolve(__dirname, '../', '.temp', req.file.filename)));

        switch (tipoAssinatura) {
            case "Representantes":
                console.log("Tipo de Assinatura: Representantes da IES Registradora")

                // PERFIL DE ASSINATURA * DEIXAR SEMPRE 'ADRC' PARA ASSINATURAS DE REPRESENTANTES DE IES REGISTRADORA *
                formData.append('profile', 'ADRC');

                // Abaixo estão os parâmetros que devem ser configurados n vezes em caso de assinatura em lote. 
                // Cada posição do array pode conter uma configuração diferente. 
                // Se não for lote, basta configurar n = 0.

                // DEIXAR FIXO COMO 'DadosRegistro' PARA ASSINATURAS DE REPRESENTANTES DA IES REGISTRADORA*
                formData.append('originalDocuments[0][specificNode][name]', 'DadosRegistro');

                // DEIXAR COMO FIXO 'http://portal.mec.gov.br/diplomadigital/arquivos-em-xsd'
                formData.append('originalDocuments[0][specificNode][namespace]', 'http://portal.mec.gov.br/diplomadigital/arquivos-em-xsd');
                break;

            case "IESRegistradora":
                console.log("Tipo de Assinatura: IESRegistradora")

                // PERFIL DE ASSINATURA * DEIXAR SEMPRE 'ADRA' PARA ASSINATURA da IES Registradora *
                formData.append('profile', 'ADRA');

                formData.append('includeXPathEnveloped', 'false');

                // Abaixo estão os parâmetros que devem ser configurados n vezes em caso de assinatura em lote. 
                // Cada posição do array pode conter uma configuração diferente. 
                // Se não for lote, basta configurar n = 0.

                break;
        }
        const header = {
            headers: {
                // TOKEN DE ACESSO AO BRY FRAMEWORK
                'Authorization': authorization,

                //CREDENCIAL DE ACESSO AO BRY KMS
                'kms_credencial': kms_credencial_tipo === "TOKEN" ? kmsToken : kms_credencial,

                // TIPO DA CREDENCIAL FORNECIDA. ATUALMENTE SÓ HÁ SUPORTE PARA O FORMATO “PIN”.
                'kms_credencial_tipo': kms_credencial_tipo,

                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
            }
        }


        try {
            // REALIZA REQUISIÇÃO PARA O BRY HUB
            const response = await axios.post(url, formData, header);

            fs.unlinkSync(path.resolve(__dirname, '..', '.temp/', documento.filename))

            /**
             * CONSIDERANDO QUE O RETURNTYPE ESTÁ CONFIGURADO COMO 'LINK' NA REQUISIÇÃO,
             * ESTAMOS ENVIANDO O LINK PARA DOWNLOAD COM O FRONT END.
             * CASO QUERIA SALVAR EM UM REPOSITÓRIO LOCAL, BASTA CONFIGURAR O RETURNTYPE
             * COMO BASE64 E USAR A BIBLIOTECA "fs":
             * fs.writeFile("caminho/nomeDoArquivo", assinaturaEmBase64, {encoding: "base64"})
             */
            if (returnType === 'LINK') {
                console.log('Processo de assinatura finalizado!')
                return res.json(response.data)
            } else {
                const caminhoAssinado = path.resolve(__dirname, '..', 'XMLsAssinados')
                const conversorParaByteArray = new TextEncoder();
                const arquivoAssinado = atob(conversorParaByteArray.encode(response.data));
                fs.writeFile(
                    caminhoAssinado + path.sep + "exemplo-diploma-diplomado-assinado.xml",
                    arquivoAssinado,
                    {encoding: "base64"},
                    (err) => {
                        if (err) {
                            return res.status(400).json({error: "Erro ao criar arquivo"})
                        }
                        console.log("Arquivo assinado e salvo localmente");
                    });
                    return res.json({message: `Arquivo assinado e salvo em ${caminhoAssinado}`});
            }

        } catch (err) {
            console.log(err)
            return res.status(500).send({ message: err.response.data.message });
        }
    }

    async assinaXMLDocumentacaoAcademica(req, res) {

        //Tipo de assinante enviado pelo front-end (será usado no switch-case para diferentes tipos de assinantes do diploma) 
        const tipoAssinatura = req.body.tipoAssinatura;
        const signerKMS = req.body.signerKMS;
        const uuid = req.body.uuid;
        const documento = req.file;

        const formData = new FormData();
        
        // CPF DO ASSINANTE  QUE SERÁ USADO PARA VALIDAÇÃO DO CERTIFICADO
        if (signerKMS != null) {
            formData.append('signerKMS', signerKMS);
        } else {
            formData.append('uuid', uuid);
        }

        // NONCE DA REQUISIÇÃO. NONCE É UM NÚMERO QUALQUER PARA IDENTIFICAÇÃO E CONTROLE DA REQUISIÇÃO.
        formData.append('nonce', '1');

        // FORMATO DE ASSINATURA * DEIXAR SEMPRE 'ENVELOPED' *
        formData.append('signatureFormat', 'ENVELOPED');

        // ALGORITMO HASH * DEIXAR SEMPRE 'SHA256' *
        formData.append('hashAlgorithm', 'SHA256');


        formData.append('returnType', returnType);

        // Abaixo estão os parâmetros que devem ser configurados n vezes em caso de assinatura em lote. 
        // Cada posição do array pode conter uma configuração diferente. 
        // Se não for lote, basta configurar n = 0.

        // NONCE DO DOCUMENTO NA REQUISIÇÃO. NONCE É UM NÚMERO QUALQUER PARA IDENTIFICAÇÃO E CONTROLE DA REQUISIÇÃO.
        formData.append('originalDocuments[0][nonce]', '1');

        // DIPLOMA QUE DEVE SER ASSINADO, DEVE SER ADICIONADO O CAMINHO ATÉ O DIPLOMA, NESTE EXEMPLO O CAMINHO É PEGO ATRAVÉS DO FRONT-END DO EXEMPLO
        formData.append('originalDocuments[0][content]', fs.createReadStream(path.resolve(__dirname, '..', '.temp', documento.filename)));

        switch (tipoAssinatura) {
            case "Representantes":
                console.log("Tipo de Assinatura: XML Documentacao Academica - Representantes da IES Emissora")

                // PERFIL DE ASSINATURA * DEIXAR SEMPRE 'ADRC' PARA ASSINATURAS DE REPRESENTANTES DE 'IES' *
                formData.append('profile', 'ADRC');

                // Abaixo estão os parâmetros que devem ser configurados n vezes em caso de assinatura em lote. 
                // Cada posição do array pode conter uma configuração diferente. 
                // Se não for lote, basta configurar n = 0.

                formData.append('originalDocuments[0][specificNode][name]', 'DadosDiploma');

                formData.append('originalDocuments[0][specificNode][namespace]', 'http://portal.mec.gov.br/diplomadigital/arquivos-em-xsd');
                break;

            case "IESEmissoraDadosDiploma":
                console.log("Tipo de Assinatura: IES Emissora - Nodo Dados Diploma")

                // PERFIL DE ASSINATURA * DEIXAR SEMPRE 'ADRA' PARA ASSINATURAS DE REPRESENTANTES DA 'IESRegistradora' *
                formData.append('profile', 'ADRC');

                formData.append('originalDocuments[0][specificNode][name]', 'DadosDiploma');

                formData.append('originalDocuments[0][specificNode][namespace]', 'http://portal.mec.gov.br/diplomadigital/arquivos-em-xsd');

                formData.append('includeXPathEnveloped', 'false');

                break;
            
            case "IESEmissoraRegistro":
                console.log("Tipo de Assinatura: IES Emissora - Nodo Raiz")

                formData.append('profile', 'ADRA')
                formData.append('includeXPathEnveloped', 'false');
                
                break;

        }
        const header = {
            headers: {
                // TOKEN DE ACESSO AO BRY FRAMEWORK
                'Authorization': authorization,

                //CREDENCIAL DE ACESSO AO BRY KMS 
                'kms_credencial': kms_credencial_tipo === "TOKEN" ? kmsToken : kms_credencial,

                // TIPO DA CREDENCIAL FORNECIDA. ATUALMENTE SÓ HÁ SUPORTE PARA O FORMATO “PIN”.
                'kms_credencial_tipo': kms_credencial_tipo,

                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
            }
        }


        try {
            // REALIZA REQUISIÇÃO PARA O BRY HUB.
            const response = await axios.post(url, formData, header);

            fs.unlinkSync(path.resolve(__dirname, '..', '.temp', documento.filename));

            /**
             * CONSIDERANDO QUE O RETURNTYPE ESTÁ CONFIGURADO COMO 'LINK' NA REQUISIÇÃO,
             * ESTAMOS ENVIANDO O LINK PARA DOWNLOAD COM O FRONT END.
             * CASO QUERIA SALVAR EM UM REPOSITÓRIO LOCAL, BASTA CONFIGURAR O RETURNTYPE
             * COMO BASE64 E USAR A BIBLIOTECA "fs":
             * fs.writeFile("caminho/nomeDoArquivo", assinaturaEmBase64, {encoding: "base64"})
             */
            if (returnType === 'LINK') {
                console.log('Processo de assinatura finalizado!')
                return res.json(response.data)
            } else {
                const caminhoAssinado = path.resolve(__dirname, '..', 'XMLsAssinados')
                const conversorParaByteArray = new TextEncoder();
                const arquivoAssinado = atob(conversorParaByteArray.encode(response.data));
                fs.writeFile(
                    caminhoAssinado + path.sep + 'exemplo-diploma-documentacao-assinado.xml',
                    arquivoAssinado,
                    {encoding: "base64"},
                    (err) => {
                        if (err) {
                            return res.status(400).json({error: "Erro ao criar arquivo"})
                        }
                        console.log("Arquivo assinado e salvo localmente");
                    });
                    return res.json({message: `Arquivo assinado e salvo em ${caminhoAssinado}`});
            }

        } catch (err) {
            console.log(err)
            return res.status(500).send({ message: err.response.data.message });
        }
    }

    async copiaNodo(req, res) {
        return res.json({message: 'Operação não suportada pelo back-end. Realize a copia manualmente ou utilize algum dos exemplos em Python ou Java.'})
    }

}


module.exports = new AssinaXMLs;