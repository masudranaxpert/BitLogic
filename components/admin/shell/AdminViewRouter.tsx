'use client';

import { useRouter } from 'next/navigation';
import type { AdminTab } from '@/lib/admin/types';
import type {
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  AdminSupportTicket,
  SubscriberUser,
  PaymentTransaction,
  CouponCode,
  MediaAsset,
  ProductVariant,
  WarrantyPlan,
  CredentialScheme,
  ProductCategory,
} from '@/lib/admin/types';
import OverviewView from '@/components/admin/views/OverviewView';
import ProductsView from '@/components/admin/views/ProductsView';
import ProductAddView from '@/components/admin/views/ProductAddView';
import ProductDetailView from '@/components/admin/views/ProductDetailView';
import WarrantiesView from '@/components/admin/views/WarrantiesView';
import CredentialSchemesView from '@/components/admin/views/CredentialSchemesView';
import CategoriesView from '@/components/admin/views/CategoriesView';
import VaultView from '@/components/admin/views/VaultView';
import { useEffect } from 'react';
import AddOrderView from '@/components/admin/views/orders/AddOrderView';
import CouponsView from '@/components/admin/views/CouponsView';
import VaultManualAddView from '@/components/admin/views/VaultManualAddView';
import VaultBulkImportView from '@/components/admin/views/VaultBulkImportView';
import VaultCredentialView from '@/components/admin/views/VaultCredentialView';
import VaultCredentialEditView from '@/components/admin/views/VaultCredentialEditView';
import DeliveriesView from '@/components/admin/views/DeliveriesView';
import TicketsView from '@/components/admin/views/TicketsView';
import UsersSubscriptionsView from '@/components/admin/views/UsersSubscriptionsView';
import MediaManagerView from '@/components/admin/views/MediaManagerView';
import PaymentsView from '@/components/admin/views/PaymentsView';
import PaymentMethodsView from '@/components/admin/views/payments/PaymentMethodsView';
import FeatureControlView from '@/components/admin/views/FeatureControlView';
import EmailSettingsView from '@/components/admin/views/settings/EmailSettingsView';
import EmailTemplatesView from '@/components/admin/views/settings/EmailTemplatesView';
import EmailTriggersView from '@/components/admin/views/settings/EmailTriggersView';
import ContactInfoView from '@/components/admin/views/settings/ContactInfoView';
import StorefrontView from '@/components/admin/views/settings/StorefrontView';
import SuppliersView from '@/components/admin/views/suppliers/SuppliersView';
import SupplierCatalogView from '@/components/admin/views/suppliers/SupplierCatalogView';
import SupplierLinksView from '@/components/admin/views/suppliers/SupplierLinksView';
import SupplierPurchasesView from '@/components/admin/views/suppliers/SupplierPurchasesView';
import SupplierSettingsView from '@/components/admin/views/suppliers/SupplierSettingsView';
import StaffView from '@/components/admin/views/StaffView';
import StaffFormView from '@/components/admin/views/StaffFormView';
import { StaffActionsView, StaffFileView, StaffLoginsView } from '@/components/admin/views/StaffActivity';
import { SecurityOverviewView } from '@/components/admin/views/security/SecurityOverviewView';
import { SecurityIpsView } from '@/components/admin/views/security/SecurityIpsView';
import { SecurityAuditView } from '@/components/admin/views/security/SecurityAuditView';
import { SecurityRulesView } from '@/components/admin/views/security/SecurityRulesView';

function ProductOptionRedirect({
  productId,
  variantId,
  onRedirect,
  onBack,
}: {
  productId: string | null;
  variantId: string | null;
  onRedirect: (productId: string | null, variantId: string | null) => void;
  onBack: () => void;
}) {
  useEffect(() => {
    onRedirect(productId, variantId);
    // Intentionally only when route ids change — avoid redirect loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId]);

  return (
    <div className="p-6 text-xs text-slate-500">
      Opening full product editor…
      <button
        type="button"
        onClick={onBack}
        className="ml-2 text-emerald-700 underline cursor-pointer border-0 bg-transparent p-0"
      >
        Back
      </button>
    </div>
  );
}

export type AdminViewRouterProps = {
  activeTab: AdminTab;
  searchParams: { get: (key: string) => string | null };
  setActiveTab: (tab: AdminTab) => void;
  openProductOptionPage: (productId?: string, variantId?: string) => void;
  openProductEditPage: (productId: string, variantId?: string) => void;
  openProductViewPage: (productId: string, variantId?: string) => void;
  products: DigitalProduct[];
  warranties: WarrantyPlan[];
  onWarrantiesChange: (next: WarrantyPlan[]) => void;
  credentialSchemes: CredentialScheme[];
  onCredentialSchemesChange: (next: CredentialScheme[]) => void;
  productCategories: ProductCategory[];
  onProductCategoriesChange: (next: ProductCategory[]) => void;
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  tickets: AdminSupportTicket[];
  subscribers: SubscriberUser[];
  payments: PaymentTransaction[];
  coupons: CouponCode[];
  mediaAssets: MediaAsset[];
  selectedChatDeliveryId: string | null;
  selectedTicketId: string | null;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  preselectedVaultTarget: { productId: string; variantId: string } | null;
  setPreselectedVaultTarget: (
    next: { productId: string; variantId: string } | null,
  ) => void;
  handleOpenQuickRestock: (productId: string, variantId: string) => void;
  handleVerifyPayment: (paymentId: string) => void;
  handleSaveNewProduct: (
    product: DigitalProduct,
    credentials: VaultCredential[],
  ) => void;
  handleUpdateProduct: (
    product: DigitalProduct,
    credentials: VaultCredential[],
  ) => void;
  handleAddVariant: (productId: string, variant: ProductVariant) => void;
  handleUpdateVariant: (productId: string, variant: ProductVariant) => void;
  handleTogglePlanActive: (
    productId: string,
    variantId: string,
    nextActive: boolean,
  ) => void;
  handleDeleteCredential: (id: string) => void;
  handleUpdateCredential: (item: VaultCredential) => void;
  handleAddCredentials: (items: VaultCredential[]) => void;
  openVaultViewPage: (id: string) => void;
  openVaultEditPage: (id: string) => void;
  handleSelectChatDelivery: (id: string | null) => void;
  handleSendOrderChatMessage: (...args: any[]) => void;
  handleFulfillDelivery: (...args: any[]) => void;
  handleUpdateDeliveryVpn: (
    deliveryIds: string[],
    patch: { vpnRequired: boolean; vpnRegionNote: string },
  ) => void;
  handleTogglePinOrder: (deliveryId: string) => void;
  handleSelectTicket: (id: string | null) => void;
  handleReplyTicket: (...args: any[]) => void;
  handleUpdateTicketStatus: (...args: any[]) => void;
  handleUpdateTicketPriority: (...args: any[]) => void;
  handleCreateTicket: (...args: any[]) => void;
  handleOpenOrderChatFromTicket: (orderId: string, deliveryId?: string) => void;
  handleAddCustomer: (customer: SubscriberUser) => void;
  handleRenewSubscription: (...args: any[]) => void;
  handleAssignSubscription: (...args: any[]) => void;
  reloadWorkspace: () => Promise<void>;
  handleMarkOrderChatRead: (orderId: string) => void;
  handleSetWarrantyStart: (deliveryIds: string[], startsAt: string) => void;
  handleRefundOrder: (req: import('@/components/admin/views/deliveries/OrderDetailView').RefundRequest) => void;
  showToast: (message: string) => void;
  handleToggleUserStatus: (userId: string) => void;
  handleUpdateCustomer: (...args: any[]) => void;
  handleAddMediaAsset: (asset: MediaAsset) => void;
  handleDeleteMediaAsset: (id: string) => void;
  handleRejectOrRefundPayment: (...args: any[]) => void;
  handleAddCoupon: (coupon: CouponCode) => void;
  handleToggleCoupon: (couponId: string) => void;
};

export function AdminViewRouter(props: AdminViewRouterProps) {
  const router = useRouter();
  const openOrder = (orderId: string) => {
    const first = props.deliveries
      .filter((d) => d.orderId === orderId)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))[0];
    if (first) router.push('/admin/orders?id=' + encodeURIComponent(first.id));
  };
  const openCustomerByEmail = (email: string) => {
    const sub = props.subscribers.find((s) => s.email.toLowerCase() === email.toLowerCase());
    if (!sub) return;
    props.setSelectedCustomerId(sub.id);
    props.setActiveTab('user-detail');
  };
  const {
    activeTab,
    searchParams,
    setActiveTab,
    openProductOptionPage,
    openProductEditPage,
    openProductViewPage,
    products,
    warranties,
    onWarrantiesChange,
    credentialSchemes,
    onCredentialSchemesChange,
    productCategories,
    onProductCategoriesChange,
    vault,
    deliveries,
    tickets,
    subscribers,
    payments,
    coupons,
    mediaAssets,
    selectedChatDeliveryId,
    selectedTicketId,
    selectedCustomerId,
    setSelectedCustomerId,
    preselectedVaultTarget,
    setPreselectedVaultTarget,
    handleOpenQuickRestock,
    handleVerifyPayment,
    handleSaveNewProduct,
    handleUpdateProduct,
    handleAddVariant,
    handleUpdateVariant,
    handleDeleteCredential,
    handleUpdateCredential,
    handleAddCredentials,
    openVaultViewPage,
    openVaultEditPage,
    handleSelectChatDelivery,
    handleSendOrderChatMessage,
    handleFulfillDelivery,
    handleUpdateDeliveryVpn,
    handleTogglePinOrder,
    handleSelectTicket,
    handleReplyTicket,
    handleUpdateTicketStatus,
    handleUpdateTicketPriority,
    handleCreateTicket,
    handleOpenOrderChatFromTicket,
    handleAddCustomer,
    handleRenewSubscription,
    handleAssignSubscription,
    reloadWorkspace,
    showToast,
    handleRefundOrder,
    handleMarkOrderChatRead,
    handleSetWarrantyStart,
    handleToggleUserStatus,
    handleUpdateCustomer,
    handleAddMediaAsset,
    handleDeleteMediaAsset,
    handleRejectOrRefundPayment,
    handleAddCoupon,
    handleToggleCoupon,
  } = props;

  return (
    <>
          {activeTab === 'overview' && (
            <OverviewView
              products={products}
              vault={vault}
              deliveries={deliveries}
              payments={payments}
              onNavigate={setActiveTab}
              onOpenQuickRestock={handleOpenQuickRestock}
              onVerifyPayment={handleVerifyPayment}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              vault={vault}
              deliveries={deliveries}
              payments={payments}
              onOpenAddProductPage={() => setActiveTab('product-add')}
              onOpenAddOptionPage={(productId) => {
                if (productId) openProductEditPage(productId);
                else setActiveTab('product-add');
              }}
              onOpenEditOptionPage={(productId, variantId) =>
                openProductEditPage(productId, variantId)
              }
              onOpenViewOptionPage={(productId, variantId) =>
                openProductViewPage(productId, variantId)
              }
              onOpenQuickRestock={handleOpenQuickRestock}
              onTogglePlanActive={props.handleTogglePlanActive}
            />
          )}

          {activeTab === 'product-add' && (
            <ProductAddView
              key={searchParams.get('productId') ?? 'product-new'}
              mediaAssets={mediaAssets}
              warranties={warranties}
              credentialSchemes={credentialSchemes}
              productCategories={productCategories}
              editingProduct={
                searchParams.get('productId')
                  ? products.find((p) => p.id === searchParams.get('productId')) ||
                    null
                  : null
              }
              focusVariantId={searchParams.get('variantId')}
              onSaveProduct={handleSaveNewProduct}
              onUpdateProduct={handleUpdateProduct}
              onCancel={() => setActiveTab('products')}
              onAddMedia={handleAddMediaAsset}
              onOpenMediaLibrary={() => setActiveTab('media')}
              onOpenWarranties={() => setActiveTab('warranties')}
              onOpenCredentialTypes={() => setActiveTab('credential-types')}
              onOpenCategories={() => setActiveTab('categories')}
            />
          )}

          {activeTab === 'product-view' && (
            <ProductDetailView
              key={searchParams.get('productId') ?? 'product-view-none'}
              product={
                searchParams.get('productId')
                  ? products.find((p) => p.id === searchParams.get('productId')) ||
                    null
                  : null
              }
              selectedVariantId={searchParams.get('variantId')}
              vault={vault}
              onBack={() => setActiveTab('products')}
              onEdit={(prodId, varId) => openProductEditPage(prodId, varId)}
            />
          )}

          {activeTab === 'warranties' && (
            <WarrantiesView warranties={warranties} onChange={onWarrantiesChange} />
          )}

          {activeTab === 'credential-types' && (
            <CredentialSchemesView
              schemes={credentialSchemes}
              onChange={onCredentialSchemesChange}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesView
              categories={productCategories}
              products={products}
              onChange={onProductCategoriesChange}
            />
          )}

          {activeTab === 'product-option' && (
            // Legacy thin form route — always bounce to full Add/Edit Product page.
            <ProductOptionRedirect
              productId={searchParams.get('productId')}
              variantId={searchParams.get('variantId')}
              onRedirect={(productId, variantId) => {
                if (productId) openProductEditPage(productId, variantId || undefined);
                else setActiveTab('product-add');
              }}
              onBack={() => setActiveTab('products')}
            />
          )}

          {activeTab === 'vault' && (
            <VaultView
              products={products}
              vault={vault}
              onOpenManualAddPage={() => setActiveTab('vault-manual')}
              onOpenBulkImportPage={() => setActiveTab('vault-bulk')}
              onViewCredential={openVaultViewPage}
              onEditCredential={openVaultEditPage}
              onDeleteCredential={handleDeleteCredential}
            />
          )}

          {activeTab === 'vault-manual' && (
            <VaultManualAddView
              products={products}
              vault={vault}
              credentialSchemes={credentialSchemes}
              preselectedTarget={preselectedVaultTarget}
              onClearPreselectedTarget={() => setPreselectedVaultTarget(null)}
              onAddCredentials={handleAddCredentials}
              onBackToVault={() => setActiveTab('vault')}
            />
          )}

          {activeTab === 'vault-bulk' && (
            <VaultBulkImportView
              products={products}
              vault={vault}
              onAddCredentials={handleAddCredentials}
              onBackToVault={() => setActiveTab('vault')}
            />
          )}

          {activeTab === 'vault-view' && (
            <VaultCredentialView
              key={searchParams.get('id') || 'missing'}
              item={
                vault.find((v) => v.id === searchParams.get('id')) || null
              }
              onBack={() => setActiveTab('vault')}
              onEdit={openVaultEditPage}
              onDelete={handleDeleteCredential}
            />
          )}

          {activeTab === 'vault-edit' && (
            <VaultCredentialEditView
              key={searchParams.get('id') || 'missing'}
              item={
                vault.find((v) => v.id === searchParams.get('id')) || null
              }
              onBack={() => setActiveTab('vault')}
              onSave={handleUpdateCredential}
            />
          )}

          {(activeTab === 'deliveries' ||
            activeTab === 'orders-pinned' ||
            activeTab === 'orders-renewals' ||
            activeTab === 'warranty-claims') && (
            <DeliveriesView
              products={products}
              vault={vault}
              deliveries={deliveries}
              payments={payments}
              subscribers={subscribers}
              onCreateOrderDelivery={handleAssignSubscription}
              selectedChatDeliveryId={selectedChatDeliveryId}
              onSelectChatDelivery={handleSelectChatDelivery}
              onSendOrderChatMessage={handleSendOrderChatMessage}
              onFulfillDelivery={handleFulfillDelivery}
              onUpdateDeliveryVpn={handleUpdateDeliveryVpn}
              onTogglePinOrder={handleTogglePinOrder}
              onVerifyPayment={handleVerifyPayment}
              onRejectPayment={(id: string) => handleRejectOrRefundPayment(id, 'rejected')}
              onRefundOrder={handleRefundOrder}
              onMarkOrderChatRead={handleMarkOrderChatRead}
              onSetWarrantyStart={handleSetWarrantyStart}
              pageMode={
                activeTab === 'orders-pinned'
                  ? 'pinned'
                  : activeTab === 'orders-renewals'
                    ? 'renewals'
                    : activeTab === 'warranty-claims'
                      ? 'warranty'
                      : 'all'
              }
              pageTitle={
                activeTab === 'orders-pinned'
                  ? 'Pinned Orders'
                  : activeTab === 'orders-renewals'
                    ? 'Renewals'
                    : activeTab === 'warranty-claims'
                      ? 'Warranty Claims'
                      : 'Orders'
              }
            />
          )}

          {activeTab === 'order-add' && (
            <AddOrderView
              products={products}
              subscribers={subscribers}
              vault={vault}
              initialCustomerId={searchParams.get('customerId')}
              onBack={() => setActiveTab('deliveries')}
              onCreated={async ({ orderId, firstDeliveryId }) => {
                await reloadWorkspace();
                showToast('Order ' + orderId + ' created.');
                router.push(
                  firstDeliveryId
                    ? '/admin/orders?id=' + encodeURIComponent(firstDeliveryId)
                    : '/admin/orders',
                );
              }}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketsView
              tickets={tickets}
              deliveries={deliveries}
              selectedTicketId={selectedTicketId}
              onSelectTicket={handleSelectTicket}
              onReplyTicket={handleReplyTicket}
              onUpdateTicketStatus={handleUpdateTicketStatus}
              onUpdateTicketPriority={handleUpdateTicketPriority}
              onCreateTicket={handleCreateTicket}
              onOpenOrderChat={handleOpenOrderChatFromTicket}
            />
          )}

          {(activeTab === 'users' || activeTab === 'user-detail' || activeTab === 'user-add') && (
            <UsersSubscriptionsView
              mode={
                activeTab === 'user-add'
                  ? 'add'
                  : activeTab === 'user-detail'
                  ? 'detail'
                  : 'list'
              }
              subscribers={subscribers}
              products={products}
              deliveries={deliveries}
              payments={payments}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={(userId) => {
                setSelectedCustomerId(userId);
                setActiveTab('user-detail');
              }}
              onOpenAddCustomer={() => setActiveTab('user-add')}
              onBackToList={() => setActiveTab('users')}
              onAddCustomer={handleAddCustomer}
              onRenewSubscription={handleRenewSubscription}
              onAssignSubscription={handleAssignSubscription}
              onToggleUserStatus={handleToggleUserStatus}
              onUpdateCustomer={handleUpdateCustomer}
            />
          )}

          {activeTab === 'media' && (
            <MediaManagerView
              mediaAssets={mediaAssets}
              onAddMedia={handleAddMediaAsset}
              onDeleteMedia={handleDeleteMediaAsset}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              payments={payments}
              deliveries={deliveries}
              subscribers={subscribers}
              onVerifyPayment={handleVerifyPayment}
              onRejectOrRefundPayment={handleRejectOrRefundPayment}
              onOpenOrder={openOrder}
              onOpenCustomer={openCustomerByEmail}
            />
          )}

          {activeTab === 'payment-methods' && <PaymentMethodsView initialTab="methods" />}
          {activeTab === 'payment-devices' && <PaymentMethodsView initialTab="devices" />}
          {activeTab === 'payment-logs' && <PaymentMethodsView initialTab="logs" />}

          {activeTab === 'coupons' && (
            <CouponsView
              coupons={coupons}
              onAddCoupon={handleAddCoupon}
              onToggleCoupon={handleToggleCoupon}
            />
          )}

          {activeTab === 'features' && <FeatureControlView />}

          {activeTab === 'email' && <EmailSettingsView />}
          {activeTab === 'email-templates' && <EmailTemplatesView />}
          {activeTab === 'email-triggers' && <EmailTriggersView />}

          {activeTab === 'contact' && <ContactInfoView />}

          {activeTab === 'storefront' && <StorefrontView products={products} />}

          {activeTab === 'suppliers' && <SuppliersView onOpen={(tab) => setActiveTab(tab)} />}
          {activeTab === 'supplier-catalog' && <SupplierCatalogView />}
          {activeTab === 'supplier-links' && <SupplierLinksView />}
          {activeTab === 'supplier-orders' && <SupplierPurchasesView onOpenOrder={(id) => handleSelectChatDelivery(id)} />}
          {activeTab === 'supplier-settings' && <SupplierSettingsView />}

          {activeTab === 'staff' && (
            <StaffView
              onOpenAdd={() => setActiveTab('staff-add')}
              onOpenEdit={(id) =>
                router.push(`/admin/staff/add?id=${encodeURIComponent(id)}`)
              }
              onOpenView={(id) =>
                router.push(`/admin/staff/view?id=${encodeURIComponent(id)}`)
              }
            />
          )}
          {activeTab === 'staff-view' && (
            <StaffFileView
              key={searchParams.get('id') ?? 'none'}
              userId={searchParams.get('id')}
            />
          )}
          {activeTab === 'staff-logins' && (
            <StaffLoginsView
              key={searchParams.get('id') ?? 'none'}
              userId={searchParams.get('id')}
            />
          )}
          {activeTab === 'staff-actions' && (
            <StaffActionsView
              key={searchParams.get('id') ?? 'none'}
              userId={searchParams.get('id')}
              category="all"
            />
          )}

          {activeTab === 'activity' && (
            <StaffActionsView key="activity-all" userId={null} category="all" />
          )}
          {activeTab === 'activity-payments' && (
            <StaffActionsView key="activity-payments" userId={null} category="payments" />
          )}
          {activeTab === 'activity-orders' && (
            <StaffActionsView key="activity-orders" userId={null} category="orders" />
          )}
          {activeTab === 'activity-catalog' && (
            <StaffActionsView key="activity-catalog" userId={null} category="catalog" />
          )}
          {activeTab === 'activity-customers' && (
            <StaffActionsView key="activity-customers" userId={null} category="customers" />
          )}
          {activeTab === 'activity-logins' && (
            <StaffActionsView key="activity-logins" userId={null} category="logins" />
          )}
          {activeTab === 'activity-system' && (
            <StaffActionsView key="activity-system" userId={null} category="system" />
          )}

          {activeTab === 'staff-add' && (
            <StaffFormView
              key={searchParams.get('id') ?? 'staff-new'}
              editId={searchParams.get('id')}
              onCancel={() => setActiveTab('staff')}
              onSaved={() => setActiveTab('staff')}
            />
          )}

          {activeTab === 'security' && (
            <SecurityOverviewView onNavigateTab={(t) => setActiveTab(t as any)} />
          )}
          {activeTab === 'security-ips' && <SecurityIpsView />}
          {activeTab === 'security-audit' && <SecurityAuditView />}
          {activeTab === 'security-rules' && <SecurityRulesView />}
    </>
  );
}
