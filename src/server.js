const express = require('express');
const cors = require('cors');
const multer = require('multer')
const AssinaXMLs = require('./AssinaXMLs');

const app = express();
const upload = multer({dest: './.temp'})

app.use(cors());
app.use(express.json());

app.post('/XMLDiplomado/assinaKms', upload.single('documento'), AssinaXMLs.assinaXMLDiplomado)
app.post('/XMLDocumentacaoAcademica/assinaKms', upload.single('documento'), AssinaXMLs.assinaXMLDocumentacaoAcademica)
app.post('/XMLDiplomado/copia-nodo', AssinaXMLs.copiaNodo);

app.listen(3333);