{{- define "ledger-service.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "ledger-service.fullname" -}}
{{- .Release.Name -}}-{{- .Chart.Name -}}
{{- end -}}

{{- define "ledger-service.labels" -}}
app.kubernetes.io/name: {{ include "ledger-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "ledger-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ledger-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "ledger-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "ledger-service.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
