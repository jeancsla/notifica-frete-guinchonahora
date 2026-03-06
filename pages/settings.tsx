import Layout from "../components/Layout";
import { InlineRefreshStatus, LoadingButton } from "../components/LoadingUI";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { isRefreshing, lastUpdatedAt, refreshError, toast, wrapRefresh } =
    useRefreshFeedback();

  return (
    <Layout
      title="Configurações"
      subtitle="Configurações de operação, notificações e alertas."
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
            <CardTitle>Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Canal primário
                </span>
                <span className="font-semibold">WhatsApp</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Escalonamento
                </span>
                <Badge
                  variant="default"
                  className="bg-green-500/20 text-green-600 hover:bg-green-500/30"
                >
                  Ativo
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Intervalo</span>
                <span className="font-semibold">5 min</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Prioridades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ajustes são controlados pelo backend. Esta tela mostra o estado
              atual.
            </p>
            <Badge variant="secondary">Integração via API</Badge>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
