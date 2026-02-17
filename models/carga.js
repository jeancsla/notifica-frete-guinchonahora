class Carga {
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
    return !!(
      this.id_viagem &&
      typeof this.id_viagem === "string" &&
      this.id_viagem.length > 0
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

  static fromScrapedData(data) {
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

export default Carga;
