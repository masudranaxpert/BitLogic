'use client';

import type { AdminTab } from '@/lib/admin/types';
import type {
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  AdminSupportTicket,
  SubscriberUser,
  PaymentTransaction,
  CouponCode,
  SystemFeatureFlag,
  MediaAsset,
  ProductVariant,
  WarrantyPlan,
  CredentialScheme,
  ProductCategory,
} from '@/lib/admin/types';
import OverviewView from '@/components/admin/views/OverviewView';
import ProductsView from '@/components/admin/views/ProductsView';
import ProductAddView from '@/components/admin/views/ProductAddView';
import WarrantiesView from '@/components/admin/views/WarrantiesView';
import CredentialSchemesView from '@/components/admin/views/CredentialSchemesView';
import CategoriesView from '@/components/admin/views/CategoriesView';
import VaultView from '@/components/admin/views/VaultView';
import { useEffect } from 'react';
import VaultManualAddView from '@/components/admin/views/VaultManualAddView';
import VaultBulkImportView from '@/components/admin/views/VaultBulkImportView';
import VaultCredentialView from '@/components/admin/views/VaultCredentialView';
import VaultCredentialEditView from '@/components/admin/views/VaultCredentialEditView';
import DeliveriesView from '@/components/admin/views/DeliveriesView';
import TicketsView from '@/components/admin/views/TicketsView';
import UsersSubscriptionsView from '@/components/admin/views/UsersSubscriptionsView';
import MediaManagerView from '@/components/admin/views/MediaManagerView';
import PaymentsView from '@/components/admin/views/PaymentsView';
import FeatureControlView from '@/components/admin/views/FeatureControlView';

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
  features: SystemFeatureFlag[];
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
  handleDeleteCredential: (id: string) => void;
  handleUpdateCredential: (item: VaultCredential) => void;
  handleAddCredentials: (items: VaultCredential[]) => void;
  openVaultViewPage: (id: string) => void;
  openVaultEditPage: (id: string) => void;
  handleSelectChatDelivery: (id: string | null) => void;
  handleSendOrderChatMessage: (...args: any[]) => void;
  handleSimulateBuyerMessage: (deliveryId: string) => void;
  handleFulfillDelivery: (...args: any[]) => void;
  handleTogglePinOrder: (deliveryId: string) => void;
  handleSelectTicket: (id: string | null) => void;
  handleReplyTicket: (...args: any[]) => void;
  handleUpdateTicketStatus: (...args: any[]) => void;
  handleUpdateTicketPriority: (...args: any[]) => void;
  handleCreateTicket: (...args: any[]) => void;
  handleSimulateBuyerTicketReply: (ticketId: string) => void;
  handleOpenOrderChatFromTicket: (orderId: string, deliveryId?: string) => void;
  handleAddCustomer: (customer: SubscriberUser) => void;
  handleRenewSubscription: (...args: any[]) => void;
  handleAssignSubscription: (...args: any[]) => void;
  handleToggleUserStatus: (userId: string) => void;
  handleUpdateCustomer: (...args: any[]) => void;
  handleAddMediaAsset: (asset: MediaAsset) => void;
  handleDeleteMediaAsset: (id: string) => void;
  handleRejectOrRefundPayment: (...args: any[]) => void;
  handleAddCoupon: (coupon: CouponCode) => void;
  handleToggleCoupon: (couponId: string) => void;
  handleToggleFeature: (id: string) => void;
};

export function AdminViewRouter(props: AdminViewRouterProps) {
  const {
    activeTab,
    searchParams,
    setActiveTab,
    openProductOptionPage,
    openProductEditPage,
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
    features,
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
    handleSimulateBuyerMessage,
    handleFulfillDelivery,
    handleTogglePinOrder,
    handleSelectTicket,
    handleReplyTicket,
    handleUpdateTicketStatus,
    handleUpdateTicketPriority,
    handleCreateTicket,
    handleSimulateBuyerTicketReply,
    handleOpenOrderChatFromTicket,
    handleAddCustomer,
    handleRenewSubscription,
    handleAssignSubscription,
    handleToggleUserStatus,
    handleUpdateCustomer,
    handleAddMediaAsset,
    handleDeleteMediaAsset,
    handleRejectOrRefundPayment,
    handleAddCoupon,
    handleToggleCoupon,
    handleToggleFeature,
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
              onOpenAddProductPage={() => setActiveTab('product-add')}
              onOpenAddOptionPage={(productId) => {
                if (productId) openProductEditPage(productId);
                else setActiveTab('product-add');
              }}
              onOpenEditOptionPage={(productId, variantId) =>
                openProductEditPage(productId, variantId)
              }
              onOpenQuickRestock={handleOpenQuickRestock}
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
              onOpenMediaLibrary={() => setActiveTab('media')}
              onOpenWarranties={() => setActiveTab('warranties')}
              onOpenCredentialTypes={() => setActiveTab('credential-types')}
              onOpenCategories={() => setActiveTab('categories')}
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
              onSimulateBuyerMessage={handleSimulateBuyerMessage}
              onFulfillDelivery={handleFulfillDelivery}
              onTogglePinOrder={handleTogglePinOrder}
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
              onSimulateBuyerTicketReply={handleSimulateBuyerTicketReply}
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
              coupons={coupons}
              onVerifyPayment={handleVerifyPayment}
              onRejectOrRefundPayment={handleRejectOrRefundPayment}
              onAddCoupon={handleAddCoupon}
              onToggleCoupon={handleToggleCoupon}
            />
          )}

          {activeTab === 'features' && (
            <FeatureControlView
              features={features}
              onToggleFeature={handleToggleFeature}
            />
          )}
    </>
  );
}
