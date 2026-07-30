// =====================================================================
// JSON – EXPORTAR E IMPORTAR DADOS DO CASO (FASE 1.7D2 – incluir13FinalAberto)
// =====================================================================

function coletarDadosCaso() {
    const dados = {
        versao: "3.3",
        tipoArquivo: "calculo_judicial_previdenciario",
        dataExportacao: new Date().toLocaleDateString('pt-BR'),
        entradas: {
            processo: {
                vara: document.getElementById('vara').value,
                numero: document.getElementById('processo').value,
                autor: document.getElementById('autor').value,
                reu: document.getElementById('reu').value,
                cpf: document.getElementById('cpf').value,
                dataCalculo: document.getElementById('dataCalculo').value,
                observacoes: document.getElementById('observacoes').value
            },
            tipoAcao: document.getElementById('tipoAcao').value,
            datas: {
                ajuizamento: document.getElementById('dataAjuizamento').value,
                atualizacao: document.getElementById('dataAtualizacao').value,
                inicioJuros: document.getElementById('inicioJuros').value
            },
            prescricao: {
                aplicar: document.getElementById('aplicarPrescricao').value === 'sim',
                prazoAnos: parseInt(document.getElementById('prazoPrescricional').value) || 5,
                termoInicial: estadoTermoInicial.valor,
                termoInicialManual: estadoTermoInicial.manual
            },
            beneficioDevido: {
                nb: document.getElementById('nb').value,
                especie: document.getElementById('especie').value,
                tipo: document.getElementById('tipoBeneficio').value,
                dib: document.getElementById('dib').value,
                rmi: document.getElementById('rmi').value,
                transformado: document.querySelector('input[name="transformado"]:checked').value === 'sim',
                dibAntecedente: document.getElementById('dibAnterior').value,
                percentualDesdobramento: document.getElementById('percentualDesdobramento').value,
                adicionalTipo: document.getElementById('adicionalRenda').value,
                adicionalPercentual: document.getElementById('adicionalPercentual').value,
                dataFinalEvolucao: document.getElementById('dataFinal').value,
                dipDevido: document.getElementById('dipDevido').value,
                possuiAbono: document.getElementById('possuiAbonoDevido').checked,
                baseadoSalarioMinimo: document.getElementById('baseadoSalarioMinimoDevido').checked,
                incluir13FinalAberto: document.getElementById('incluir13FinalAberto').checked // NOVO
            }
        },
        evolucaoDevida: {},
        beneficiosRecebidos: coletarBeneficiosRecebidos(),
        diferencas: {
            modoCompensacao: dadosDiferencas.modoCompensacao,
            celulasEditadas: dadosDiferencas.celulasEditadas,
            justificativas: dadosDiferencas.justificativas
        },
        atualizacao: {
            dataAtualizacao: document.getElementById('dataAtualizacao2').value,
            inicioJuros: document.getElementById('inicioJuros2').value,
            criterioCorrecao: document.getElementById('criterioCorrecao').value,
            criterioJuros: document.getElementById('criterioJuros').value,
            observacoes: document.getElementById('obsAtualizacao').value
        },
        acordoRenuncia: {
            acordo: {
                ativo: document.getElementById('acordoAtivo').value === 'sim',
                percentual: document.getElementById('percentualAcordo').value,
                observacoes: document.getElementById('obsAcordo').value
            },
            renuncia: {
                ativo: document.getElementById('renunciaAtiva').value === 'sim',
                tipoLimite: document.getElementById('tipoLimiteRenuncia').value,
                qtdSalarios: document.getElementById('qtdSalariosRenuncia').value,
                valorLimite: document.getElementById('valorLimiteRenuncia').value,
                dataReferencia: document.getElementById('dataReferenciaRenuncia').value,
                observacoes: document.getElementById('obsRenuncia').value
            }
        }
    };
    return dados;
}

// =====================================================================
// AUXILIARES PARA NOME DO ARQUIVO JSON
// =====================================================================

function sanitizarAutor(nome) {
    if (!nome || nome.trim() === '') return 'SEM_AUTOR';
    const semAcentos = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let sanitizado = semAcentos
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
    sanitizado = sanitizado.replace(/_+/g, '_');
    sanitizado = sanitizado.replace(/^_|_$/g, '');
    return sanitizado || 'SEM_AUTOR';
}

function extrairSeisPrimeirosNumeros(processo) {
    if (!processo) return 'SEM_PROCESSO';
    const numeros = processo.replace(/\D/g, '');
    if (numeros.length === 0) return 'SEM_PROCESSO';
    return numeros.substring(0, 6);
}

function formatarDataHoraArquivo() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    const segundos = String(agora.getSeconds()).padStart(2, '0');
    return `${dia}${mes}${ano}-${horas}-${minutos}-${segundos}`;
}

// =====================================================================
// EXPORTAR
// =====================================================================

function exportarCaso() {
    const dados = coletarDadosCaso();
    const json = JSON.stringify(dados, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const autor = document.getElementById('autor')?.value?.trim() || '';
    const processo = document.getElementById('processo')?.value?.trim() || '';

    const autorSanitizado = sanitizarAutor(autor);
    const numeroProcesso = extrairSeisPrimeirosNumeros(processo);
    const dataHora = formatarDataHoraArquivo();

    const nomeArquivo = `calc_${autorSanitizado}_${numeroProcesso}_${dataHora}.json`;

    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// =====================================================================
// IMPORTAR
// =====================================================================

function importarCaso(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (dados.tipoArquivo !== 'calculo_judicial_previdenciario') {
                alert('O arquivo selecionado não corresponde a um caso previdenciário.');
                return;
            }
            if (!['3.1', '3.2', '3.3'].includes(dados.versao)) {
                alert('Versão do arquivo não suportada. Versão esperada: 3.1, 3.2 ou 3.3');
                return;
            }

            const ent = dados.entradas || {};
            const proc = ent.processo || {};
            const datas = ent.datas || {};
            const presc = ent.prescricao || { aplicar: true, prazoAnos: 5, termoInicial: '', termoInicialManual: false };
            const bene = ent.beneficioDevido || {};

            document.getElementById('vara').value = proc.vara || '';
            document.getElementById('processo').value = proc.numero || '';
            document.getElementById('autor').value = proc.autor || '';
            document.getElementById('reu').value = proc.reu || 'INSS';
            document.getElementById('cpf').value = proc.cpf || '';
            document.getElementById('dataCalculo').value = proc.dataCalculo || '';
            document.getElementById('observacoes').value = proc.observacoes || '';

            document.getElementById('tipoAcao').value = ent.tipoAcao || 'previdenciaria';
            onTipoAcaoChange();

            document.getElementById('dataAjuizamento').value = datas.ajuizamento || '';
            document.getElementById('dataAtualizacao').value = datas.atualizacao || '';
            document.getElementById('inicioJuros').value = datas.inicioJuros || '';

            document.getElementById('aplicarPrescricao').value = presc.aplicar ? 'sim' : 'nao';
            document.getElementById('prazoPrescricional').value = presc.prazoAnos || 5;

            const termoValor = presc.termoInicial || '';
            const termoManual = presc.termoInicialManual || false;
            if (termoManual) {
                termoInicialManual = true;
                document.querySelectorAll('.cadeado').forEach(el => {
                    el.classList.remove('fechado');
                    el.classList.add('aberto');
                    el.textContent = '🔓';
                });
                document.querySelectorAll('#termoInicialDiferencas, #termoInicialDiferencas2').forEach(el => {
                    if (el) {
                        el.readOnly = false;
                        el.classList.remove('bg-slate-50');
                        el.classList.add('bg-white');
                    }
                });
                definirTermoInicial(termoValor, 'manual');
            } else {
                termoInicialManual = false;
                document.querySelectorAll('.cadeado').forEach(el => {
                    el.classList.remove('aberto');
                    el.classList.add('fechado');
                    el.textContent = '🔒';
                });
                document.querySelectorAll('#termoInicialDiferencas, #termoInicialDiferencas2').forEach(el => {
                    if (el) {
                        el.readOnly = true;
                        el.classList.remove('bg-white');
                        el.classList.add('bg-slate-50');
                    }
                });
                definirTermoInicial(termoValor, 'automatico');
            }

            document.getElementById('nb').value = bene.nb || '';
            document.getElementById('especie').value = bene.especie || '';
            document.getElementById('tipoBeneficio').value = bene.tipo || 'previdenciario';
            document.getElementById('dib').value = bene.dib || '';
            document.getElementById('rmi').value = bene.rmi || '';
            
            const transformado = bene.transformado ? 'sim' : 'nao';
            document.querySelector(`input[name="transformado"][value="${transformado}"]`).checked = true;
            toggleTransformacao(transformado === 'sim');
            
            document.getElementById('dibAnterior').value = bene.dibAntecedente || '';
            document.getElementById('percentualDesdobramento').value = bene.percentualDesdobramento || '100,00';
            document.getElementById('adicionalRenda').value = bene.adicionalTipo || '0';
            toggleAdicionalPercentual(document.getElementById('adicionalRenda'));
            document.getElementById('adicionalPercentual').value = bene.adicionalPercentual || '';
            document.getElementById('dataFinal').value = bene.dataFinalEvolucao || '';

            const dipDevido = document.getElementById('dipDevido');
            if (dipDevido) {
                dipDevido.value = bene.dipDevido || '';
                dipDevido.dataset.ultimoValor = bene.dipDevido || '';
            }

            const checkboxAbono = document.getElementById('possuiAbonoDevido');
            if (checkboxAbono) {
                const tipoAtual = document.getElementById('tipoBeneficio').value;
                if (bene.possuiAbono !== undefined) {
                    checkboxAbono.checked = bene.possuiAbono;
                } else {
                    checkboxAbono.checked = (tipoAtual === 'previdenciario');
                }
            }

            const checkboxSM = document.getElementById('baseadoSalarioMinimoDevido');
            if (checkboxSM) {
                const tipoAtual = document.getElementById('tipoBeneficio').value;
                if (bene.baseadoSalarioMinimo !== undefined) {
                    checkboxSM.checked = bene.baseadoSalarioMinimo;
                } else {
                    checkboxSM.checked = (tipoAtual === 'assistencial');
                }
            }

            // NOVO: Restaurar incluir13FinalAberto
            const incluir13FinalAberto = document.getElementById('incluir13FinalAberto');
            if (incluir13FinalAberto) {
                incluir13FinalAberto.checked = (bene.incluir13FinalAberto !== undefined) ? bene.incluir13FinalAberto : false;
            }

            if (typeof atualizarEstadoBaseadoSalarioMinimo === 'function') {
                atualizarEstadoBaseadoSalarioMinimo();
            }

            const atu = dados.atualizacao || {};
            document.getElementById('dataAtualizacao2').value = atu.dataAtualizacao || '';
            document.getElementById('inicioJuros2').value = atu.inicioJuros || '';
            document.getElementById('criterioCorrecao').value = atu.criterioCorrecao || '';
            document.getElementById('criterioJuros').value = atu.criterioJuros || '';
            document.getElementById('obsAtualizacao').value = atu.observacoes || '';

            const ar = dados.acordoRenuncia || {};
            const ac = ar.acordo || {};
            const ren = ar.renuncia || {};
            document.getElementById('acordoAtivo').value = ac.ativo ? 'sim' : 'nao';
            document.getElementById('percentualAcordo').value = ac.percentual || '100%';
            document.getElementById('obsAcordo').value = ac.observacoes || '';
            document.getElementById('renunciaAtiva').value = ren.ativo ? 'sim' : 'nao';
            document.getElementById('tipoLimiteRenuncia').value = ren.tipoLimite || 'salarios';
            document.getElementById('qtdSalariosRenuncia').value = ren.qtdSalarios || '';
            document.getElementById('valorLimiteRenuncia').value = ren.valorLimite || '';
            document.getElementById('dataReferenciaRenuncia').value = ren.dataReferencia || '';
            document.getElementById('obsRenuncia').value = ren.observacoes || '';

            if (dados.beneficiosRecebidos) {
                restaurarBeneficiosRecebidos(dados.beneficiosRecebidos);
            } else {
                restaurarBeneficiosRecebidos([]);
            }

            if (dados.diferencas) {
                dadosDiferencas.modoCompensacao = dados.diferencas.modoCompensacao || 'limite';
                dadosDiferencas.celulasEditadas = dados.diferencas.celulasEditadas || {};
                if (dados.diferencas.justificativas) {
                    const just = dados.diferencas.justificativas;
                    for (const comp in just) {
                        if (typeof just[comp] === 'string') {
                            just[comp] = { texto: just[comp], incluirNoRelatorio: false };
                        }
                    }
                    dadosDiferencas.justificativas = just;
                } else {
                    dadosDiferencas.justificativas = {};
                }
                const radio = document.querySelector(`input[name="modoCompensacao"][value="${dadosDiferencas.modoCompensacao}"]`);
                if (radio) radio.checked = true;
                montarTabelaDiferencas();
            }

            if (!termoManual) calcularTermoInicial();

            alert('Dados do caso importados com sucesso!');
        } catch (error) {
            alert('Erro ao importar o arquivo: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// =====================================================================
// NOVO CASO
// =====================================================================

function novoCaso() {
    if (confirm('Limpar todos os dados do caso atual?')) {
        limparFormulario();
        restaurarBeneficiosRecebidos([]);
        dadosDiferencas.modoCompensacao = 'limite';
        dadosDiferencas.celulasEditadas = {};
        dadosDiferencas.justificativas = {};
        document.querySelector('input[name="modoCompensacao"][value="limite"]').checked = true;
        const cbAbono = document.getElementById('possuiAbonoDevido');
        if (cbAbono) cbAbono.checked = true;
        const cbSM = document.getElementById('baseadoSalarioMinimoDevido');
        if (cbSM) cbSM.checked = false;
        const cbIncluir13 = document.getElementById('incluir13FinalAberto');
        if (cbIncluir13) cbIncluir13.checked = false;
    }
}
