// =====================================================================
// ADMINISTRAÇÃO DE ENCADEAMENTOS – Fase 1.8A (CORRIGIDO)
// =====================================================================
// Gerencia criação, validação, importação/exportação de JSONs de parâmetros
// de correção monetária e juros de mora. Nenhum cálculo financeiro.
// =====================================================================

window.parametrosCorrecaoAtual = null;
window.parametrosJurosAtual = null;
window.parametrosSelicAtual = null;

// =====================================================================
// AUXILIARES (sem conflito com funções de outros arquivos)
// =====================================================================

function adminCompetenciaParaNumero(str) {
    if (!str) return NaN;
    var partes = str.split('/');
    if (partes.length !== 2) return NaN;
    var mes = parseInt(partes[0], 10);
    var ano = parseInt(partes[1], 10);
    if (isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12 || ano < 1900) return NaN;
    return ano * 100 + mes;
}

function adminProximaCompetenciaNumero(num) {
    var ano = Math.floor(num / 100);
    var mes = num % 100;
    if (mes === 12) return (ano + 1) * 100 + 1;
    return ano * 100 + (mes + 1);
}

function adminParseValorBrasileiro(texto) {
    if (!texto) return 0;
    var limpo = texto
        .replace(/[^0-9,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    return parseFloat(limpo) || 0;
}

function adminSanitizarNome(nome) {
    if (!nome) return 'ENCADEAMENTO_SEM_NOME';
    var semAcentos = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var sanitizado = semAcentos
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
    sanitizado = sanitizado.replace(/_+/g, '_');
    sanitizado = sanitizado.replace(/^_|_$/g, '');
    return sanitizado || 'ENCADEAMENTO_SEM_NOME';
}

function adminGerarNomeArquivo(tipo, nome) {
    var nomeSanitizado = adminSanitizarNome(nome);
    var tipoMap = {
        'correcao_monetaria': 'correcao_monetaria',
        'juros_mora': 'juros_mora',
        'selic': 'selic',
        'taxa_legal': 'taxa_legal'
    };
    var prefixo = tipoMap[tipo] || 'parametro';
    return 'parametros_' + prefixo + '_' + nomeSanitizado + '.json';
}

function adminDataAtualFormatada() {
    var agora = new Date();
    var dia = String(agora.getDate()).padStart(2, '0');
    var mes = String(agora.getMonth() + 1).padStart(2, '0');
    var ano = agora.getFullYear();
    return dia + '/' + mes + '/' + ano;
}

// =====================================================================
// GERENCIAMENTO DO MODAL ADMINISTRATIVO
// =====================================================================

var adminModalCriado = false;
var adminEventosVinculados = false;
var adminTipoAtual = 'correcao_monetaria';

function criarModalAdmin() {
    if (document.getElementById('adminModal')) return;

    var overlay = document.createElement('div');
    overlay.id = 'adminModal';
    overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden modal-overlay';

    var modalContent = document.createElement('div');
    modalContent.className = 'bg-white p-6 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl';

    modalContent.innerHTML = `
        <h3 class="text-xl font-bold text-slate-800 mb-4">Administração de Parâmetros de Atualização</h3>

        <div id="adminMensagens" class="mb-4 p-3 rounded-md hidden"></div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo do parâmetro</label>
                <select id="adminTipoParametro" class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="correcao_monetaria">Correção Monetária</option>
                    <option value="juros_mora">Juros de Mora</option>
                    <option value="selic" disabled>SELIC (futuro)</option>
                    <option value="taxa_legal" disabled>Taxa Legal (futuro)</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nome do encadeamento *</label>
                <input type="text" id="adminNome" placeholder="Ex: CJF_PREVIDENCIARIO_2025" class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            </div>
        </div>

        <div class="mb-4">
            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Descrição (opcional)</label>
            <textarea id="adminDescricao" rows="2" placeholder="Breve descrição do encadeamento..." class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></textarea>
        </div>

        <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Períodos</h4>
                <button type="button" id="adminAdicionarLinha" class="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition">+ Adicionar Linha</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-600 text-xs uppercase">
                            <th class="p-2 text-left">Índice</th>
                            <th class="p-2 text-left">Data Inicial</th>
                            <th class="p-2 text-left">Data Final</th>
                            <th class="p-2 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody id="adminTabelaPeriodos">
                        <!-- linhas serão inseridas dinamicamente -->
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex flex-wrap gap-3 mt-4 border-t border-slate-200 pt-4">
            <button type="button" id="adminValidar" class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-semibold shadow transition">Validar Encadeamento</button>
            <button type="button" id="adminExportar" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold shadow transition">Exportar JSON</button>
            <button type="button" id="adminImportar" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold shadow transition">Importar JSON</button>
            <button type="button" id="adminFechar" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm font-semibold transition">Fechar</button>
        </div>

        <input type="file" id="adminFileInput" accept=".json" class="hidden">
    `;

    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);

    var tbody = document.getElementById('adminTabelaPeriodos');
    if (tbody) adminAdicionarLinhaPeriodo();

    if (!adminEventosVinculados) {
        vincularEventosModal();
        adminEventosVinculados = true;
    }

    adminModalCriado = true;
}

// =====================================================================
// EVENTOS DO MODAL (executados uma única vez)
// =====================================================================

function vincularEventosModal() {
    document.getElementById('adminFechar').addEventListener('click', function() {
        document.getElementById('adminModal').classList.add('hidden');
    });

    document.getElementById('adminModal').addEventListener('click', function(e) {
        if (e.target === this) this.classList.add('hidden');
    });

    document.getElementById('adminAdicionarLinha').addEventListener('click', function() {
        adminAdicionarLinhaPeriodo();
    });

    document.getElementById('adminTipoParametro').addEventListener('change', function() {
        adminTipoAtual = this.value;
        adminAtualizarSelectsIndice();
    });

    document.getElementById('adminValidar').addEventListener('click', function() {
        var dados = adminColetarDados();
        var erros = adminValidarDados(dados);
        if (erros.length === 0) {
            adminExibirMensagem('✅ Encadeamento válido!', 'success');
        } else {
            adminExibirMensagem('❌ Erros encontrados:\n' + erros.join('\n'), 'error');
        }
    });

    document.getElementById('adminExportar').addEventListener('click', function() {
        var dados = adminColetarDados();
        var erros = adminValidarDados(dados);
        if (erros.length > 0) {
            adminExibirMensagem('❌ Não é possível exportar: ' + erros.join('\n'), 'error');
            return;
        }
        adminExportarJSON(dados);
    });

    document.getElementById('adminImportar').addEventListener('click', function() {
        document.getElementById('adminFileInput').click();
    });

    document.getElementById('adminFileInput').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            try {
                var json = JSON.parse(ev.target.result);
                adminImportarJSON(json);
            } catch (err) {
                adminExibirMensagem('❌ Erro ao ler o arquivo: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        this.value = '';
    });
}

// =====================================================================
// FUNÇÕES DE LINHAS DA TABELA DE PERÍODOS
// =====================================================================

function adminObterIndicesDisponiveis() {
    var tipo = document.getElementById('adminTipoParametro').value;
    if (tipo === 'correcao_monetaria') {
        return ['INPC', 'IPCAE', 'IPCA', 'IGPDI', 'IGPM', 'TR', 'IRSM', 'URV', 'IPC_R', 'ORTN', 'OTN', 'BTN'];
    } else if (tipo === 'juros_mora') {
        return ['JUROS_MORA_1_AM', 'JUROS_MORA_05_AM', 'POUPANCA', 'TAXA_LEGAL', 'SELIC'];
    }
    return ['INPC'];
}

function adminCriarSelectIndice(valorAtual) {
    var indices = adminObterIndicesDisponiveis();
    var html = '<select class="admin-select-indice w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">';
    indices.forEach(function(idx) {
        var selected = (idx === valorAtual) ? 'selected' : '';
        html += '<option value="' + idx + '" ' + selected + '>' + idx + '</option>';
    });
    html += '</select>';
    return html;
}

function adminAdicionarLinhaPeriodo(indice, inicio, fim) {
    var tbody = document.getElementById('adminTabelaPeriodos');
    if (!tbody) return;

    var tr = document.createElement('tr');
    tr.className = 'border-b border-slate-200';

    var selectIndice = adminCriarSelectIndice(indice || '');

    tr.innerHTML = `
        <td class="p-2">${selectIndice}</td>
        <td class="p-2"><input type="text" class="admin-data-inicio w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="MM/AAAA" value="${inicio || ''}"></td>
        <td class="p-2"><input type="text" class="admin-data-fim w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="MM/AAAA ou vazio" value="${fim || ''}"></td>
        <td class="p-2 text-center"><button type="button" class="admin-remover-linha text-red-600 hover:text-red-800 text-xs font-bold">✕</button></td>
    `;

    tbody.appendChild(tr);

    tr.querySelector('.admin-remover-linha').addEventListener('click', function() {
        if (tbody.children.length > 1) {
            tr.remove();
        } else {
            adminExibirMensagem('É necessário pelo menos uma linha.', 'warning');
        }
    });

    tr.querySelectorAll('.admin-data-inicio, .admin-data-fim').forEach(function(input) {
        input.addEventListener('input', function() {
            var v = this.value.replace(/\D/g, '');
            if (v.length > 6) v = v.substring(0, 6);
            if (v.length >= 3) {
                this.value = v.substring(0, 2) + '/' + v.substring(2);
            } else {
                this.value = v;
            }
        });
    });
}

function adminAtualizarSelectsIndice() {
    var selects = document.querySelectorAll('#adminTabelaPeriodos .admin-select-indice');
    var indices = adminObterIndicesDisponiveis();
    selects.forEach(function(sel) {
        var valorAtual = sel.value;
        var options = indices.map(function(idx) {
            return '<option value="' + idx + '" ' + (idx === valorAtual ? 'selected' : '') + '>' + idx + '</option>';
        }).join('');
        sel.innerHTML = options;
    });
}

// =====================================================================
// COLETA E VALIDAÇÃO DOS DADOS DO ADMIN
// =====================================================================

function adminColetarDados() {
    var tipo = document.getElementById('adminTipoParametro').value;
    var nome = document.getElementById('adminNome').value.trim();
    var descricao = document.getElementById('adminDescricao').value.trim();

    var linhas = document.querySelectorAll('#adminTabelaPeriodos tr');
    var periodos = [];
    linhas.forEach(function(tr) {
        var indiceSelect = tr.querySelector('.admin-select-indice');
        var inicioInput = tr.querySelector('.admin-data-inicio');
        var fimInput = tr.querySelector('.admin-data-fim');
        if (!indiceSelect || !inicioInput) return;

        var indice = indiceSelect.value;
        var inicio = inicioInput.value.trim();
        var fim = fimInput.value.trim();

        // Coleta todas as linhas, mesmo se incompletas (a validação tratará)
        periodos.push({ indice: indice, inicio: inicio, fim: fim });
    });

    return { tipo: tipo, nome: nome, descricao: descricao, periodos: periodos };
}

function adminValidarDados(dados) {
    var erros = [];

    if (!dados.nome) {
        erros.push('Nome do encadeamento é obrigatório.');
    }

    if (!dados.tipo) {
        erros.push('Tipo do parâmetro é obrigatório.');
    }

    if (dados.periodos.length === 0) {
        erros.push('Adicione pelo menos um período.');
        return erros;
    }

    var regexMMAAAA = /^\d{2}\/\d{4}$/;
    var periodosAbertos = 0;
    var periodoAnteriorFimNum = null;

    var periodosOrdenados = dados.periodos.slice().sort(function(a, b) {
        return adminCompetenciaParaNumero(a.inicio) - adminCompetenciaParaNumero(b.inicio);
    });

    for (var i = 0; i < periodosOrdenados.length; i++) {
        var p = periodosOrdenados[i];

        if (!p.indice) {
            erros.push('Linha ' + (i+1) + ': Índice não selecionado.');
            continue;
        }

        if (!p.inicio || !regexMMAAAA.test(p.inicio)) {
            erros.push('Linha ' + (i+1) + ': Data inicial "' + p.inicio + '" inválida. Use MM/AAAA.');
            continue;
        }
        var numInicio = adminCompetenciaParaNumero(p.inicio);
        if (isNaN(numInicio)) {
            erros.push('Linha ' + (i+1) + ': Data inicial "' + p.inicio + '" inválida.');
            continue;
        }

        var numFim = null;
        if (p.fim) {
            if (!regexMMAAAA.test(p.fim)) {
                erros.push('Linha ' + (i+1) + ': Data final "' + p.fim + '" inválida. Use MM/AAAA ou deixe vazio.');
                continue;
            }
            numFim = adminCompetenciaParaNumero(p.fim);
            if (isNaN(numFim)) {
                erros.push('Linha ' + (i+1) + ': Data final "' + p.fim + '" inválida.');
                continue;
            }
            if (numFim < numInicio) {
                erros.push('Linha ' + (i+1) + ': Data final anterior à data inicial.');
                continue;
            }
        } else {
            periodosAbertos++;
            if (periodosAbertos > 1) {
                erros.push('Linha ' + (i+1) + ': Apenas um período pode estar aberto (sem data final).');
                continue;
            }
            numFim = Number.MAX_SAFE_INTEGER;
        }

        if (periodoAnteriorFimNum !== null && numInicio <= periodoAnteriorFimNum) {
            erros.push('Linha ' + (i+1) + ': Período se sobrepõe ao anterior (' + periodosOrdenados[i-1].inicio + ' a ' + (periodosOrdenados[i-1].fim || 'aberto') + ').');
        }

        periodoAnteriorFimNum = numFim;
    }

    return erros;
}

function adminExibirMensagem(texto, tipo) {
    var div = document.getElementById('adminMensagens');
    if (!div) return;
    div.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-amber-100', 'text-amber-700');
    div.textContent = texto;

    if (tipo === 'success') {
        div.classList.add('bg-green-100', 'text-green-700');
    } else if (tipo === 'error') {
        div.classList.add('bg-red-100', 'text-red-700');
    } else if (tipo === 'warning') {
        div.classList.add('bg-amber-100', 'text-amber-700');
    }
}

// =====================================================================
// EXPORTAÇÃO DO JSON DE PARÂMETROS
// =====================================================================

function adminExportarJSON(dados) {
    var tipo = dados.tipo;
    var nome = dados.nome;
    var descricao = dados.descricao;
    var periodos = dados.periodos;

    var periodosOrdenados = periodos.slice().sort(function(a, b) {
        return adminCompetenciaParaNumero(a.inicio) - adminCompetenciaParaNumero(b.inicio);
    });

    var indices = [];
    periodosOrdenados.forEach(function(p) {
        if (indices.indexOf(p.indice) === -1) indices.push(p.indice);
    });

    var jsonObj = {
        tipoArquivo: 'parametros_atualizacao',
        tipoParametro: tipo,
        versao: '1.0',
        nome: nome,
        descricao: descricao || '',
        dataCriacao: adminDataAtualFormatada(),
        indicesUtilizados: indices,
        periodos: periodosOrdenados.map(function(p) {
            return {
                indice: p.indice,
                inicio: p.inicio,
                fim: p.fim || ''
            };
        })
    };

    var jsonStr = JSON.stringify(jsonObj, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');

    var nomeArquivo = adminGerarNomeArquivo(tipo, nome);
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    adminExibirMensagem('✅ JSON exportado com sucesso: ' + nomeArquivo, 'success');
}

// =====================================================================
// IMPORTAÇÃO DE JSON NO MODAL ADMIN
// =====================================================================

function adminImportarJSON(json) {
    if (json.tipoArquivo !== 'parametros_atualizacao') {
        adminExibirMensagem('❌ O arquivo não é um JSON de parâmetros de atualização.', 'error');
        return;
    }

    if (!json.tipoParametro || !json.nome || !json.periodos || json.periodos.length === 0) {
        adminExibirMensagem('❌ JSON inválido: faltam campos obrigatórios.', 'error');
        return;
    }

    var selectTipo = document.getElementById('adminTipoParametro');
    if (selectTipo) {
        var option = selectTipo.querySelector('option[value="' + json.tipoParametro + '"]');
        if (option) {
            selectTipo.value = json.tipoParametro;
            adminTipoAtual = json.tipoParametro;
        } else {
            adminExibirMensagem('⚠️ Tipo "' + json.tipoParametro + '" não suportado. Será usado "correcao_monetaria".', 'warning');
            selectTipo.value = 'correcao_monetaria';
            adminTipoAtual = 'correcao_monetaria';
        }
    }

    document.getElementById('adminNome').value = json.nome || '';
    document.getElementById('adminDescricao').value = json.descricao || '';

    var tbody = document.getElementById('adminTabelaPeriodos');
    tbody.innerHTML = '';

    json.periodos.forEach(function(p) {
        adminAdicionarLinhaPeriodo(p.indice, p.inicio, p.fim || '');
    });

    adminExibirMensagem('✅ JSON importado com sucesso!', 'success');
}

// =====================================================================
// FUNÇÃO PARA CARREGAR PARÂMETROS NA GUIA 5
// =====================================================================

function adminCarregarParametroGuia5(file, tipoEsperado) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var json = JSON.parse(e.target.result);
            if (json.tipoArquivo !== 'parametros_atualizacao') {
                adminExibirMensagemGuia5('O arquivo não é um JSON de parâmetros de atualização.', 'error', tipoEsperado);
                return;
            }
            if (json.tipoParametro !== tipoEsperado) {
                var nomeEsperado = tipoEsperado === 'correcao_monetaria' ? 'correção monetária' : 'juros de mora';
                adminExibirMensagemGuia5('Este arquivo não é de ' + nomeEsperado + '.', 'error', tipoEsperado);
                return;
            }
            if (!json.nome || !json.periodos || json.periodos.length === 0) {
                adminExibirMensagemGuia5('JSON inválido: faltam campos obrigatórios.', 'error', tipoEsperado);
                return;
            }

            if (tipoEsperado === 'correcao_monetaria') {
                window.parametrosCorrecaoAtual = json;
                adminExibirMensagemGuia5(
                    '✅ Parâmetros de correção carregados com sucesso!\n' +
                    'Nome: ' + json.nome + '\n' +
                    'Descrição: ' + (json.descricao || 'N/A') + '\n' +
                    'Índices: ' + (json.indicesUtilizados ? json.indicesUtilizados.join(', ') : 'N/A') + '\n' +
                    'Períodos: ' + json.periodos.length,
                    'success',
                    tipoEsperado
                );
            } else if (tipoEsperado === 'juros_mora') {
                window.parametrosJurosAtual = json;
                adminExibirMensagemGuia5(
                    '✅ Parâmetros de juros carregados com sucesso!\n' +
                    'Nome: ' + json.nome + '\n' +
                    'Descrição: ' + (json.descricao || 'N/A') + '\n' +
                    'Índices: ' + (json.indicesUtilizados ? json.indicesUtilizados.join(', ') : 'N/A') + '\n' +
                    'Períodos: ' + json.periodos.length,
                    'success',
                    tipoEsperado
                );
            }
        } catch (err) {
            adminExibirMensagemGuia5('Erro ao ler o arquivo: ' + err.message, 'error', tipoEsperado);
        }
    };
    reader.readAsText(file);
}

function adminExibirMensagemGuia5(texto, tipo, tipoEsperado) {
    var statusId = tipoEsperado === 'correcao_monetaria' ? 'statusCorrecao' : 'statusJuros';
    var div = document.getElementById(statusId);
    if (!div) return;
    div.className = 'text-sm p-2 rounded-md mt-1';
    if (tipo === 'success') {
        div.className += ' bg-green-100 text-green-700';
    } else if (tipo === 'error') {
        div.className += ' bg-red-100 text-red-700';
    } else {
        div.className += ' bg-slate-100 text-slate-600';
    }
    div.textContent = texto;
}

// =====================================================================
// COLETA DE DIFERENÇAS DA GUIA 4 (PREPARAÇÃO PARA FUTURO)
// =====================================================================

function coletarDiferencasParaAtualizacao() {
    var rows = document.querySelectorAll('#corpoDiferencas tr');
    var resultados = [];

    rows.forEach(function(tr) {
        var competencia = tr.dataset.competencia;
        if (!competencia) return;

        var diffEl = tr.querySelector('.diferenca-devida');
        if (!diffEl) return;

        var valorTexto = diffEl.textContent.trim();
        var valorNum = adminParseValorBrasileiro(valorTexto);
        // Não ignora zero, apenas NaN
        if (isNaN(valorNum)) return;

        resultados.push({
            competencia: competencia,
            diferenca: valorNum
        });
    });

    return resultados;
}

// =====================================================================
// SINCRONIZAÇÃO DAS DATAS DA GUIA 1 PARA GUIA 5
// =====================================================================

function sincronizarParametrosAtualizacao() {
    var dataAtualizacao1 = document.getElementById('dataAtualizacao');
    var dataAtualizacao2 = document.getElementById('dataAtualizacao2');
    var inicioJuros1 = document.getElementById('inicioJuros');
    var inicioJuros2 = document.getElementById('inicioJuros2');

    if (dataAtualizacao1 && dataAtualizacao2 && !dataAtualizacao2.value) {
        dataAtualizacao2.value = dataAtualizacao1.value;
    }
    if (inicioJuros1 && inicioJuros2 && !inicioJuros2.value) {
        inicioJuros2.value = inicioJuros1.value;
    }
}

// =====================================================================
// INICIALIZAÇÃO – DOMContentLoaded
// =====================================================================

document.addEventListener('DOMContentLoaded', function() {
    criarModalAdmin();

    document.addEventListener('keydown', function(e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            var modal = document.getElementById('adminModal');
            if (modal) {
                modal.classList.remove('hidden');
                var msgDiv = document.getElementById('adminMensagens');
                if (msgDiv) {
                    msgDiv.classList.add('hidden');
                    msgDiv.textContent = '';
                }
            }
        }
    });

    // Botões da Guia 5
    var btnCorrecao = document.getElementById('btnCarregarCorrecao');
    var fileCorrecao = document.getElementById('fileInputCorrecao');
    if (btnCorrecao && fileCorrecao) {
        btnCorrecao.addEventListener('click', function() {
            fileCorrecao.click();
        });
        fileCorrecao.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                adminCarregarParametroGuia5(file, 'correcao_monetaria');
            }
            this.value = '';
        });
    }

    var btnJuros = document.getElementById('btnCarregarJuros');
    var fileJuros = document.getElementById('fileInputJuros');
    if (btnJuros && fileJuros) {
        btnJuros.addEventListener('click', function() {
            fileJuros.click();
        });
        fileJuros.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                adminCarregarParametroGuia5(file, 'juros_mora');
            }
            this.value = '';
        });
    }

    document.querySelectorAll('.nav-guia button').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (this.dataset.guia === 'atualizacao') {
                sincronizarParametrosAtualizacao();
            }
        });
    });

    var guiaAtiva = document.querySelector('.nav-guia button.ativo');
    if (guiaAtiva && guiaAtiva.dataset.guia === 'atualizacao') {
        sincronizarParametrosAtualizacao();
    }

    window.coletarDiferencasParaAtualizacao = coletarDiferencasParaAtualizacao;
    window.sincronizarParametrosAtualizacao = sincronizarParametrosAtualizacao;
});