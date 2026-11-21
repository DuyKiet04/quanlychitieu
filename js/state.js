      /* ==========================================================================
       3. APPLICATION STATE
       ========================================================================== */
      const State = {
        transactions: [],
        categories: [],
        wallets: [],
        settings: {},
        categoryBudgets: {},
        recurring: [],
        journals: [],
        savingsGoals: [],
        journalMoodFilter: "all",

        activeTab: "overview",
        overviewPeriod: "30d",
        overviewCustomStart: null,
        overviewCustomEnd: null,
        cashflowRange: "7d",
        txFilter: "all",
        txSearch: "",
        txSort: "desc",
        txFilterConfig: {
          sort: "date_desc",
          type: "all",
          categoryId: "all",
          walletId: "all",
          period: "all",
          customStart: null,
          customEnd: null,
          minAmount: null,
          maxAmount: null,
          hasReceipt: false,
          hasLocation: false,
        },

        analyticsPeriod: "this_month",
        analyticsStartDate: null,
        analyticsEndDate: null,
        analyticsViewMode: "charts",
        financialCalendarDate: new Date(),
        selectedCalDay: null,

        workPeriod: "this_month",
        workCustomStart: null,
        workCustomEnd: null,
        isBalanceHidden: false,

        // Budget, Category & Recurring Screen State
        budgetFilter: "all",
        budgetSearch: "",
        categoryScreenType: "expense",
        categorySearch: "",
        recurringFilter: "all",
        recurringSearch: "",

        // Wizard State
        wizardStep: 1,
        wizardType: "expense",
        wizardAmountRaw: "0",
        wizardCategoryId: null,
        wizardReceiptBlob: null,
        wizardReceiptDataUrl: null,
        wizardLocation: null,
        editingTxId: null,

        // Spending Map State
        mapPeriod: "all",
        mapType: "all",
        mapRadius: 0,
        mapSearch: "",
        mapSelectedTxId: null,
        userGpsCoords: null,
        mapLayerType: "auto",
        mapHeatmapEnabled: false,
      };

      /* Chart & Map Instances */
      let overviewCashflowChartInstance = null;
      let overviewCategoryChartInstance = null;
      let analyticsTrendChartInstance = null;
      let analyticsCategoryDonutChartInstance = null;
      let analyticsComparisonChartInstance = null;
      let analyticsHorizontalBarChartInstance = null;
      let workComparisonChartInstance = null;

      /* Leaflet Map Global Instances & Layers */
      let spendingMap = null;
      let mapTileLayer = null;
      let spendingHeatmapLayer = null;
      let mapMarkersLayer = null;
      let mapRadiusCircle = null;
      let mapUserMarker = null;
      let mapCurrentLayerKey = "google_roadmap";
      let overviewMiniMap = null;
      let overviewMiniMapMarkersLayer = null;
