export class Carga {
  id_viagem: string;
  tipoTransporte?: string;
  origem?: string;
  destino?: string;
  produto?: string;
  equipamento?: string;
  prevColeta?: string;
  qtdeEntregas?: string;
  vrFrete?: string;
  termino?: string;

  constructor({
    id_viagem,
    tipoTransporte,
    origem,
    destino,
    produto,
    equipamento,
    prevColeta,
    qtdeEntregas,
    vrFrete,
    termino,
  }: {
    id_viagem: string;
    tipoTransporte?: string;
    origem?: string;
    destino?: string;
    produto?: string;
    equipamento?: string;
    prevColeta?: string;
    qtdeEntregas?: string;
    vrFrete?: string;
    termino?: string;
  }) {
    this.id_viagem = id_viagem;
    this.tipoTransporte = tipoTransporte;
    this.origem = origem;
    this.destino = destino;
    this.produto = produto;
    this.equipamento = equipamento;
    this.prevColeta = prevColeta;
    this.qtdeEntregas = qtdeEntregas;
    this.vrFrete = vrFrete;
    this.termino = termino;
  }

  isValid() {
    return Boolean(
      this.id_viagem &&
      typeof this.id_viagem === "string" &&
      this.id_viagem.length > 0 &&
      this.id_viagem.length <= 50 &&
      (!this.origem || this.origem.length <= 255) &&
      (!this.destino || this.destino.length <= 255),
    );
  }

  toWhatsAppMessage() {
    return [
      "Da uma olhada no site da Mills:",
      `De: ${this.origem || "N/A"}`,
      `Para: ${this.destino || "N/A"}`,
      `Produto: ${this.produto || "N/A"}`,
      `Veiculo: ${this.equipamento || "N/A"}`,
      `Previsao de Coleta: ${this.prevColeta || "N/A"}`,
      "https://gestaotegmatransporte.ventunolog.com.br/Login",
    ].join("\n");
  }

  toDatabase() {
    return {
      id_viagem: this.id_viagem,
      tipo_transporte: this.tipoTransporte,
      origem: this.origem,
      destino: this.destino,
      produto: this.produto,
      equipamento: this.equipamento,
      prev_coleta: this.prevColeta,
      qtd_entregas: this.qtdeEntregas,
      vr_frete: this.vrFrete,
      termino: this.termino,
    };
  }

  static fromScrapedData(data: {
    viagem: string;
    tipoTransporte?: string;
    origem?: string;
    destino?: string;
    produto?: string;
    equipamento?: string;
    prevColeta?: string;
    qtdeEntregas?: string;
    vrFrete?: string;
    termino?: string;
  }) {
    return new Carga({
      id_viagem: data.viagem,
      tipoTransporte: data.tipoTransporte,
      origem: data.origem,
      destino: data.destino,
      produto: data.produto,
      equipamento: data.equipamento,
      prevColeta: data.prevColeta,
      qtdeEntregas: data.qtdeEntregas,
      vrFrete: data.vrFrete,
      termino: data.termino,
    });
  }
}
