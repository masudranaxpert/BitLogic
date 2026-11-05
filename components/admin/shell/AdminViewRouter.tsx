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
} from '@/lib/admin/types';
import OverviewView from '@/components/admin/views/OverviewView';
import ProductsView from '@/components/admin/views/ProductsView';
import ProductAddView from '@/components/admin/views/ProductAddView';
import VaultView from '@/components/admin/views/VaultView';
import { useEffect } from 'react';
import VaultManualAddView from '@/components/admin/views/VaultManualAddView';
import VaultBulkImportView from '@/components/admin/views/VaultBulkImportView';
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
  handleAddCredentials: (items: VaultCredential[]) => void;
  handleSelectChatDelivery: (id: string | null) => void;
  handleSendOrderChatMessage: (...args: any[]) => void;
  handleSimulateBuyerMessage: (deliveryId: string) => void;
  handleFulfillDelivery: (...args: any[]) => void;
  handleSimulateOrder: (...args: any[]) => void;
  handleSelectTicket: (id: string | null) => void;
  handleReplyTicket: (...args: any[]) => void;
  handleUpdateTicketStatus: (...args: any[]) => void;
  handleUpdateTicketPriority: (...args: any[]) => void;
  handleCreateTicket: (...args: any[]) => void;
  handleSimulateBuyerTicketReply: (ticketId: string) => void;
  handleOpenOrderChatFromTicket: (orderId: string, deliveryId?: string) => void;
  handleAddCustomer: (customer: SubscriberUser) => void;
  handleExtendSubscription: (...args: any[]) => void;
  handleAssignSubscription: (...args: any[]) => void;
  handleToggleUserStatus: (userId: string) => void;
  handleChangeUserRole: (...args: any[]) => void;
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
    handleAddCredentials,
    handleSelectChatDelivery,
    handleSendOrderChatMessage,
    handleSimulateBuyerMessage,
    handleFulfillDelivery,
    handleSimulateOrder,
    handleSelectTicket,
    handleReplyTicket,
    handleUpdateTicketStatus,
    handleUpdateTicketPriority,
    handleCreateTicket,
    handleSimulateBuyerTicketReply,
    handleOpenOrderChatFromTicket,
    handleAddCustomer,
    handleExtendSubscription,
    handleAssignSubscription,
    handleToggleUserStatus,
    handleChangeUserRole,
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
              onDeleteCredential={handleDeleteCredential}
            />
          )}

          {activeTab === 'vault-manual' && (
            <VaultManualAddView
              products={products}
              vault={vault}
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

          {activeTab === 'deliveries' && (
            <DeliveriesView
              products={products}
              vault={vault}
              deliveries={deliveries}
              selectedChatDeliveryId={selectedChatDeliveryId}
              onSelectChatDelivery={handleSelectChatDelivery}
              onSendOrderChatMessage={handleSendOrderChatMessage}
              onSimulateBuyerMessage={handleSimulateBuyerMessage}
              onFulfillDelivery={handleFulfillDelivery}
              onSimulateOrder={handleSimulateOrder}
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
              onExtendSubscription={handleExtendSubscription}
              onAssignSubscription={handleAssignSubscription}
              onToggleUserStatus={handleToggleUserStatus}
              onChangeUserRole={handleChangeUserRole}
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
