import Layout from "../components/Layout";
import { InlineRefreshStatus, LoadingButton } from "../components/LoadingUI";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { isRefreshing, lastUpdatedAt, refreshError, toast, wrapRefresh } =
    useRefreshFeedback();

  return (
    <Layout
      title="Perfil"
      subtitle="Informações operacionais do responsável pelo turno."
      actions={
        <>
          <LoadingButton
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            onClick={() =>
              wrapRefresh(
                () =>
                  new Promise((resolve) => {
                    setTimeout(resolve, 320);
                  }),
              )
            }
            loading={isRefreshing}
            loadingLabel="Atualizando..."
          >
            Atualizar
          </LoadingButton>
          <InlineRefreshStatus
            isLoading={false}
            isValidating={isRefreshing}
            error={refreshError}
            lastUpdatedAt={lastUpdatedAt}
          />
        </>
      }
    >
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
      <section
        className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${
          isRefreshing ? "opacity-75 transition-opacity" : ""
        }`}
        aria-busy={isRefreshing ? "true" : "false"}
      >
        <Card>
          <CardHeader>
            <CardTitle>Operador principal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Nome</span>
                <span className="font-semibold">Equipe Guincho Na Hora</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Turno</span>
                <span className="font-semibold">24/7</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="default"
                  className="bg-green-500/20 text-green-600 hover:bg-green-500/30"
                >
                  Online
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contato interno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="font-semibold text-right">
                  operacoes@guinchonahora.com
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Telefone</span>
                <span className="font-semibold">+55 11 99999-9999</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Canal</span>
                <span className="font-semibold">WhatsApp / Slack</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <section
        className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 ${
          isRefreshing ? "opacity-75 transition-opacity" : ""
        }`}
        aria-busy={isRefreshing ? "true" : "false"}
      >
        <Card>
          <CardHeader>
            <CardTitle>Escala</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Rodízio automático via API de turnos.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Permissões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Dashboard de leitura total.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Última atualização</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sincronizado automaticamente.
            </p>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
