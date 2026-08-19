import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import InvoiceList from "@/components/InvoiceList";

export default async function MaintenanceInvoicesPage() {
  const dict = await getDictionary(await getRequestLocale());
  // Maintenance and warehouse invoices are the same purchase_invoice rows behind
  // one Domain column, guarded by the same wh.invoices permissions, so they share
  // the WAREHOUSE_INVOICE attachment owner type rather than needing their own.
  return (
    <InvoiceList
      dict={dict.warehouseInvoices}
      errorsDict={dict.errors}
      commonDict={dict.common}
      attachmentsDict={dict.attachments}
      attachmentOwnerType="WAREHOUSE_INVOICE"
      basePath="/maintenance/invoices"
      itemsPath="/maintenance/parts"
    />
  );
}
