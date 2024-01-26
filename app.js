const fs = require('fs')
const express = require('express')
const app = express()
const port = 3001

function parseTickerFile(filePath) {
    try {
      // Read the content of the file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
  
      // Split the content into lines
      const lines = fileContent.split('\n');
  
      // Create a map to store tickers and CIKs
      const tickerToCIKMap = {};
      const CIKtoTickerMap = {};
  
      // Loop through each line and populate the map
      lines.forEach(line => {
        const [ticker, cik] = line.split('\t');
        if (ticker && cik) {
            const parsedCik = parseInt(cik.trim(), 10)
            const lowerCaseTicker = ticker.trim().toLowerCase()

            tickerToCIKMap[lowerCaseTicker] = parsedCik;
            CIKtoTickerMap[parsedCik] = lowerCaseTicker;
        }
      });
  
      return [tickerToCIKMap, CIKtoTickerMap];
    } catch (error) {
      console.error('Error reading or parsing the file:', error.message);
      return null;
    }
}
  
// Example usage:
const filePath = 'ticker.txt';
const [tickerToCIKMap, CIKtoTickerMap] = parseTickerFile(filePath);

if (tickerToCIKMap) {
    //console.log('Ticker to CIK Map:', tickerToCIKMap);
} else {
    console.log('Error parsing the ticker file.');
}

function padZeros(inputString, targetLength) {
    const currentLength = inputString.length;

    if (currentLength >= targetLength) {
       return inputString; // No need to pad if the string is already long enough
    }

    const numberOfZeros = targetLength - currentLength;
    const zeroPadding = '0'.repeat(numberOfZeros);

    return zeroPadding + inputString;
}  

async function main () {
    try {
        /*const file = fs.createWriteStream('companyfacts.zip')
        const request = http.get("http://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip", function(response) {
        response.pipe(file);

            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                console.log("companyfacts.zip download completed");
            });
        });*/

        //await extract("companyfacts.zip", { dir: path.join(__dirname, 'companyfacts') })
        //console.log('Extraction complete')
    } catch (err) {
        console.error(err)
        // handle any errors
    }
}

main()

function retrieveTag(parsedJSON, years, tag, isBalanceSheetItem) {
    const temporary = []
    const result = []
    const tagUsdUnits = parsedJSON.facts["us-gaap"][tag]?.units?.USD

    if (tagUsdUnits !== undefined) {
        for (let i=0; i<tagUsdUnits.length; i++) {
            const unit = tagUsdUnits[i]
            for(let i2=0; i2<years.length; i2++) {
                const year = years[i2]
                const yearString = "CY"+year.toString()
                const previousFileDate = (temporary[year] && temporary[year][1])
                const filedDate = new Date(unit.filed)

                //if ((unit.fp === undefined || unit.fp === "FY") && (previousFileDate === undefined || filedDate < previousFileDate) && ((unit.end.substring(0,4)===year.toString() && (unit.start === undefined || ((new Date(unit.end) - new Date(unit.start)) > 30222000000))))) {
                if (unit.frame===yearString) {
                    temporary[year] = [unit.val, filedDate]
                    
                }
            }
        }
    }

    temporary.forEach((value, i) => {
        result[i] = value[0]
    })

    return result
}

function retrieveEntityName(parsedJSON, parsedFIX, dataObject) {
    if (parsedFIX?.entityName !== undefined) {
        dataObject.name = parsedFIX.entityName
        return
    }
    dataObject.name = parsedJSON.entityName
}

function priority() {
    for(let i=0; i<arguments.length; i++) {
        const argument = arguments[i]
        if (argument !== undefined && argument !== null && !isNaN(argument)) {
            return argument
        }
    }
}

function fix(parsedFIX, attribute, year) {
    if (parsedFIX.all !== undefined && parsedFIX.all[attribute]) {
        return parsedFIX.all[attribute]
    }

    if (parsedFIX[year] !== undefined && parsedFIX[year][attribute] !== undefined) {
        return parsedFIX[year][attribute]
    }
}

function retrieveFiscalYearEnd(parsedJSON, parsedFIX, years, dataObject) {
    let day = 31  // We want to know how many zeros we can strip from the values 
    let month = 12

    const balanceSheets = {}

    if (!parsedJSON.facts) return
    if (parsedJSON.facts["us-gaap"]) {
        const tagUsdUnits = parsedJSON.facts["us-gaap"]["StockholdersEquity"]?.units?.USD

        if (tagUsdUnits !== undefined) {
            for (let i=0; i<tagUsdUnits.length; i++) {
                const unit = tagUsdUnits[i]

                if (unit.end.substring(0,4)===(new Date()).getFullYear().toString() && unit.form === "10-K") {
                    const endDate = new Date(unit.end)
                    return [endDate.getDate(), endDate.getMonth()+1]
                }
            }
        }
    }

    return [day, month]
}

function retrieveBalanceSheet(parsedJSON, parsedFIX, years, dataObject) {
    let maximumDivider = 1  // We want to know how many zeros we can strip from the values 
    let minimumDivider = 1000000000000

    const balanceSheets = {}

    if (!parsedJSON.facts) return
    if (parsedJSON.facts["us-gaap"]) {
        const NetIncomeLoss = retrieveTag(parsedJSON, years, "NetIncomeLoss", true)
        const NetIncomeLossAvailableToCommonStockholdersBasic = retrieveTag(parsedJSON, years, "NetIncomeLossAvailableToCommonStockholdersBasic", true)
        const ProfitLoss = retrieveTag(parsedJSON, years, "ProfitLoss", true)
        
        const CashAndCashEquivalentsAtCarryingValue = retrieveTag(parsedJSON, years, "CashAndCashEquivalentsAtCarryingValue", true)
        const CashAndDueFromBanks = retrieveTag(parsedJSON, years, "CashAndDueFromBanks", true)
        const InterestBearingDepositsInBanks = retrieveTag(parsedJSON, years, "InterestBearingDepositsInBanks", true)

        const ShortTermInvestments = retrieveTag(parsedJSON, years, "ShortTermInvestments", true)
        const MarketableSecuritiesCurrent = retrieveTag(parsedJSON, years, "MarketableSecuritiesCurrent", true)

        const MarketableSecuritiesNoncurrent = retrieveTag(parsedJSON, years, "MarketableSecuritiesNoncurrent", true)
        const ShortTermBorrowings = retrieveTag(parsedJSON, years, "ShortTermBorrowings", true)
        const DebtCurrent = retrieveTag(parsedJSON, years, "DebtCurrent", true)
        const LongTermDebtCurrent = retrieveTag(parsedJSON, years, "LongTermDebtCurrent", true)
        const LongTermDebtAndCapitalLeaseObligationsCurrent = retrieveTag(parsedJSON, years, "LongTermDebtAndCapitalLeaseObligationsCurrent", true)
        const LongTermDebtNoncurrent = retrieveTag(parsedJSON, years, "LongTermDebtNoncurrent", true)
        const LongTermDebtAndCapitalLeaseObligations = retrieveTag(parsedJSON, years, "LongTermDebtAndCapitalLeaseObligations", true)
        const LongTermDebt = retrieveTag(parsedJSON, years, "LongTermDebt", true)

        const PropertyPlantAndEquipmentNet = retrieveTag(parsedJSON, years, "PropertyPlantAndEquipmentNet", true)

        const AssetsCurrent = retrieveTag(parsedJSON, years, "AssetsCurrent", true)
        const Assets = retrieveTag(parsedJSON, years, "Assets", true)
        const LiabilitiesCurrent = retrieveTag(parsedJSON, years, "LiabilitiesCurrent", true)

        const StockholdersEquity = retrieveTag(parsedJSON, years, "StockholdersEquity", true)
        
        for (let i=0; i<years.length; i++) {
            const year = years[i]

            const NET_INCOME = (NetIncomeLoss[year] || NetIncomeLossAvailableToCommonStockholdersBasic[year] || ProfitLoss[year])
            if (NET_INCOME === undefined) {
                continue
            }

            let CASH_AND_EQUIVALENTS
            if (CashAndCashEquivalentsAtCarryingValue[year] !== undefined) {
                CASH_AND_EQUIVALENTS = CashAndCashEquivalentsAtCarryingValue[year]
            } else if (CashAndDueFromBanks[year] !== undefined || InterestBearingDepositsInBanks[year] !== undefined) {
                CASH_AND_EQUIVALENTS = (CashAndDueFromBanks[year] || 0) + (InterestBearingDepositsInBanks[year] || 0)
            } else {
                CASH_AND_EQUIVALENTS = 0
            }

            balanceSheets[year] = {
                cashAndCashEquivalents: CASH_AND_EQUIVALENTS,
                shortTermInvestments: ShortTermInvestments[year] || MarketableSecuritiesCurrent[year] || 0,
                longTermInvestments: MarketableSecuritiesNoncurrent[year] || 0,
                shortTermDebt: DebtCurrent[year] || ShortTermBorrowings[year] || LongTermDebtAndCapitalLeaseObligationsCurrent[year] || LongTermDebtCurrent[year] || 0,
                longTermDebt: LongTermDebt[year] || LongTermDebtNoncurrent[year] || LongTermDebtAndCapitalLeaseObligations[year] || 0,
                propertyPlantAndEquipmentNet: PropertyPlantAndEquipmentNet[year] || 0,
                currentAssets: AssetsCurrent[year] || 0,
                nonCurrentAssets: (Assets[year] || 0) - (AssetsCurrent[year] || 0),
                _assets: (Assets[year] || 0),
                currentLiabilities: LiabilitiesCurrent[year] || 0,
                nonCurrentLiabilities: (Assets[year] || 0) - (StockholdersEquity[year] || 0) - (LiabilitiesCurrent[year] || 0),
                _liabilities: (Assets[year] || 0) - (StockholdersEquity[year] || 0),
                _shareholderEquity: StockholdersEquity[year] || 0
            }

            for (const key in balanceSheets[year]) {
                const value = balanceSheets[year][key]
                if (value === undefined || value === 0) continue

                while (value % maximumDivider === 0) {
                    maximumDivider = maximumDivider * 1000
                }

                while (value % minimumDivider !== 0) {
                    minimumDivider = minimumDivider / 1000
                    if (minimumDivider < 1) {
                        minimumDivider = 1
                        break
                    }
                }
            }
        }
    }

    dataObject.balanceSheets = balanceSheets
    return Math.min(maximumDivider, minimumDivider)
}

const IS_BACKEND = true

function formulae(string) {
    if (!IS_BACKEND) return string;

    if (string.startsWith("=")) {
        string = string.substring(1)
    }

    return {formula: string, result: undefined}
}

function retrieveCashFlowStatement(parsedJSON, parsedFIX, years, dataObject) {
    let maximumDivider = 1  // We want to know how many zeros we can strip from the values 
    let minimumDivider = 1000000000000

    const cashFlowStatements = {}

    if (!parsedJSON.facts) return
    if (parsedJSON.facts["us-gaap"]) {
        const NetIncomeLoss = retrieveTag(parsedJSON, years, "NetIncomeLoss")
        const NetIncomeLossAvailableToCommonStockholdersBasic = retrieveTag(parsedJSON, years, "NetIncomeLossAvailableToCommonStockholdersBasic")
        const ProfitLoss = retrieveTag(parsedJSON, years, "ProfitLoss")

        const Depreciation = retrieveTag(parsedJSON, years, "Depreciation")
        const DepreciationAndAmortization = retrieveTag(parsedJSON, years, "DepreciationAndAmortization")
        const DepreciationDepletionAndAmortization = retrieveTag(parsedJSON, years, "DepreciationDepletionAndAmortization")
        const OtherDepreciationAndAmortization = retrieveTag(parsedJSON, years, "OtherDepreciationAndAmortization")

        const ShareBasedCompensation = retrieveTag(parsedJSON, years, "ShareBasedCompensation")

        const NetCashProvidedByUsedInOperatingActivities = retrieveTag(parsedJSON, years, "NetCashProvidedByUsedInOperatingActivities")

        const PaymentsToAcquirePropertyPlantAndEquipment = retrieveTag(parsedJSON, years, "PaymentsToAcquirePropertyPlantAndEquipment")

        const NetCashProvidedByUsedInInvestingActivities = retrieveTag(parsedJSON, years, "NetCashProvidedByUsedInInvestingActivities")
        const ProceedsFromMaturitiesPrepaymentsAndCallsOfAvailableForSaleSecurities = retrieveTag(parsedJSON, years, "ProceedsFromMaturitiesPrepaymentsAndCallsOfAvailableForSaleSecurities")
        const ProceedsFromSaleOfAvailableForSaleSecuritiesDebt = retrieveTag(parsedJSON, years, "ProceedsFromSaleOfAvailableForSaleSecuritiesDebt")
        const PaymentsToAcquireAvailableForSaleSecuritiesDebt = retrieveTag(parsedJSON, years, "PaymentsToAcquireAvailableForSaleSecuritiesDebt")
        const PaymentsToAcquireBusinessesNetOfCashAcquired = retrieveTag(parsedJSON, years, "PaymentsToAcquireBusinessesNetOfCashAcquired")
        const PaymentsForProceedsFromOtherInvestingActivities = retrieveTag(parsedJSON, years, "PaymentsForProceedsFromOtherInvestingActivities")
        

        for (let i=0; i<years.length; i++) {
            const year = years[i]

            const NET_INCOME = (NetIncomeLoss[year] || NetIncomeLossAvailableToCommonStockholdersBasic[year] || ProfitLoss[year])
            if (NET_INCOME === undefined) {
                continue
            }

            const DEPRECIATION_AND_AMORTIZATION = (DepreciationAndAmortization[year] || DepreciationDepletionAndAmortization[year] || OtherDepreciationAndAmortization[year] || Depreciation[year] || 0)
            const STOCK_BASED_COMPENSATION = ShareBasedCompensation[year] || 0
            const CFFO = NetCashProvidedByUsedInOperatingActivities[year] || 0
            const OTHER_OPERATING_ACTIVITIES = (CFFO - NET_INCOME) - STOCK_BASED_COMPENSATION - DEPRECIATION_AND_AMORTIZATION
            let CAPEX
            if (PaymentsToAcquirePropertyPlantAndEquipment[year] !== undefined) {
                CAPEX = PaymentsToAcquirePropertyPlantAndEquipment[year]
            } else if (NetCashProvidedByUsedInInvestingActivities[year] !== undefined) {
                CAPEX = -(NetCashProvidedByUsedInInvestingActivities[year] - (ProceedsFromMaturitiesPrepaymentsAndCallsOfAvailableForSaleSecurities[year] || 0) - (ProceedsFromSaleOfAvailableForSaleSecuritiesDebt[year] || 0) + (PaymentsToAcquireAvailableForSaleSecuritiesDebt[year] || 0) + (PaymentsToAcquireBusinessesNetOfCashAcquired[year] || 0) + (PaymentsForProceedsFromOtherInvestingActivities[year] || 0))
            } else {
                CAPEX = 0
            }

            cashFlowStatements[year] = {
                netIncome: NET_INCOME,
                depreciationAndAmortization: DEPRECIATION_AND_AMORTIZATION,
                stockBasedCompensation: STOCK_BASED_COMPENSATION,
                otherOperatingActivities: OTHER_OPERATING_ACTIVITIES,
                _cashFlowFromOperations: NET_INCOME + DEPRECIATION_AND_AMORTIZATION + STOCK_BASED_COMPENSATION + OTHER_OPERATING_ACTIVITIES,
                capex: CAPEX,
                _freeCashFlowToFirm: (NET_INCOME + DEPRECIATION_AND_AMORTIZATION + STOCK_BASED_COMPENSATION + OTHER_OPERATING_ACTIVITIES) - CAPEX
            }

            for (const key in cashFlowStatements[year]) {
                const value = cashFlowStatements[year][key]
                if (value === undefined || value === 0) continue

                while (value % maximumDivider === 0) {
                    maximumDivider = maximumDivider * 1000
                }

                while (value % minimumDivider !== 0) {
                    minimumDivider = minimumDivider / 1000
                    if (minimumDivider < 1) {
                        minimumDivider = 1
                        break
                    }
                }
            }
        }
    }

    dataObject.cashFlowStatements = cashFlowStatements
    return Math.min(maximumDivider, minimumDivider)
}

function retrieveTags(tagValues, years, tags, parsedJSON) {
    for(let i=0; i<tags.length; i++) {
        const tag = tags[i]
        tagValues[tag] = tagValues[tag] || []
        tagValues[tag] = retrieveTag(parsedJSON, years, tag)
    }
}

function map(tagValues, year, tags) {
    for(let i=0; i<tags.length; i++) {
        const tag = tags[i]
        const tagValue = (tagValues[tag] && tagValues[tag][year])

        if (tagValue !== undefined) {
            return tagValue
        }
    }
}

function retrieveIncomeStatements(parsedJSON, parsedFIX, years, dataObject) {
    let correct = false

    let maximumDivider = 1  // We want to know how many zeros we can strip from the values 
    let minimumDivider = 1000000000000

    const incomeStatements = {}

    if (!parsedJSON.facts) return
    if (parsedJSON.facts["us-gaap"]) {
        const tagValues = {}

        const tags = {}
        tags.Revenues = [
            "Revenues",
            "RevenueFromContractWithCustomerExcludingAssessedTax",
            "RevenueFromContractWithCustomerIncludingAssessedTax",
            "SalesRevenueNet", 
            "SalesRevenueServicesNet", 
            "SalesRevenueGoodsNet", 
            "RevenuesNetOfInterestExpense", 
            "HealthCareOrganizationRevenue", 
            "InterestAndDividendIncomeOperating", 
            "RealEstateRevenueNet", 
            "RevenueMineralSales", 
            "OilAndGasRevenue", 
            "FinancialServicesRevenue", 
            "RegulatedAndUnregulatedOperatingRevenue", 
            "ShippingAndHandlingRevenue", 
            "SalesRevenueFromEnergyCommoditiesAndServices", 
            "UtilityRevenue", 
            "PhaseInPlanAmountOfCapitalizedCostsRecovered", 
            "SecondaryProcessingRevenue", 
            "RevenueSteamProductsAndServices", 
            "RevenueFromLeasedAndOwnedHotels", 
            "FranchisorRevenue", 
            "SubscriptionRevenue", 
            "AdvertisingRevenue", 
            "AdmissionsRevenue", 
            "RevenueFromEnrollmentAndRegistrationFeesExcludingHospitalityEnterprises", 
            "MembershipDuesRevenueOnGoing", 
            "LicensesRevenue", 
            "RoyaltyRevenue", 
            "SalesOfOilAndGasProspects", 
            "ClearingFeesRevenue", 
            "ReimbursementRevenue", 
            "RevenueFromGrants", 
            "RevenueOtherManufacturedProducts", 
            "ConstructionMaterialsRevenue", 
            "TimberRevenue", 
            "RecyclingRevenue", 
            "OtherSalesRevenueNet", 
            "SaleOfTrustAssetsToPayExpenses", 
            "PassengerRevenue", 
            "VehicleTollRevenue", 
            "CargoAndFreightRevenue", 
            "NetInvestmentIncome", 
            "RevenuesExcludingInterestAndDividends", 
            "InvestmentBankingRevenue", 
            "UnderwritingIncomeLoss", 
            "MarketDataRevenue", 
            "ElectricUtilityRevenue"
        ]

        tags.CostOfRevenue = [
            "CostOfRevenue",
            "CostOfGoodsAndServicesSold",
            "CostOfServices",
            "CostOfGoodsSold",
            "CostOfGoodsSoldExcludingDepreciationDepletionAndAmortization",
            "CostOfGoodsSoldElectric"
        ]

        tags.InterestIncome = [
            "InterestAndDividendIncomeOperating",
            "InvestmentIncomeInterestAndDividend",
            "InterestIncomeOperating",
            "InterestAndOtherIncome", // pas inclus ici http://www.xbrlsite.com/2014/Reference/Mapping.pdf
            "InvestmentIncomeInterest" // pas inclus ici http://www.xbrlsite.com/2014/Reference/Mapping.pdf
        ]

        tags.InterestExpense = [
            "InterestExpense",
        ]
        tags.GrossProfit = [
            "GrossProfit",
        ]
        tags.CostsAndExpenses = [
            "CostsAndExpenses",
            "BenefitsLossesAndExpenses"
        ]
        tags.OperatingIncomeLoss = [
            "OperatingIncomeLoss"
        ]
        tags.OperatingExpenses = [
            "OperatingExpenses"
        ]
        tags.OtherOperatingIncomeExpenses = [
            "OtherOperatingIncome"
        ]
        tags.IncomeLossFromContinuingOperationsBeforeTax = [
            "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments",
            "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"
        ]
        tags.ResearchAndDevelopment = [
            "ResearchAndDevelopmentExpense",
            "ResearchAndDevelopmentExpenseSoftwareExcludingAcquiredInProcessCost",
            "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost",
        ]
        tags.ProvisionForLoanLeaseAndOtherLosses = [
            "ProvisionForLoanLeaseAndOtherLosses"
        ]
        tags.IncomeTaxExpenseBenefit = [
            "IncomeTaxExpenseBenefit",
            "IncomeTaxExpenseBenefitContinuingOperations",
            "FederalHomeLoanBankAssessments",
            "CurrentIncomeTaxExpenseBenefit"
        ]
        tags.IncomeLossFromDiscontinuedOperationsNetOfTax = [
            "IncomeLossFromDiscontinuedOperationsNetOfTax",
            "IncomeLossFromDiscontinuedOperationsNetOfTaxAttributableToReportingEntity"
        ]
        tags.NetIncomeLossAttributableToNoncontrollingInterest = [
            "IncomeLossFromContinuingOperationsAttributableToNoncontrollingEntity",
            "NetIncomeLossAttributableToNoncontrollingInterest",
            "NetIncomeLossAttributableToNonredeemableNoncontrollingInterest",
            "NetIncomeLossAttributableToRedeemableNoncontrollingInterest"
        ]
        tags.NetIncomeLoss = [
            "NetIncomeLoss",
            "NetIncomeLossAvailableToCommonStockholdersBasic",
            "IncomeLossFromContinuingOperations",
            "IncomeLossAttributableToParent",
            "ProfitLoss",
        ]
        tags.other = [
            "SellingGeneralAndAdministrativeExpense",
            "RevenuesNetOfInterestExpense",
            "DepreciationDepletionAndAmortization",
            "ExplorationExpense",
            "NetPeriodicDefinedBenefitsExpenseReversalOfExpenseExcludingServiceCostComponent",
            "TaxesOther",
            "IncomeLossFromEquityMethodInvestments",
            "OtherIncome",
            "GeneralAndAdministrativeExpense",
            "SellingAndMarketingExpense",
            "MarketingAndAdvertisingExpense",
            "MarketingExpense",
            "LaborAndRelatedExpense",
            "OccupancyNet",
            "CommunicationsAndInformationTechnology",
            "ProfessionalAndContractServicesExpense",
            "SellingAndMarketingExpense",
            "MarketingAndAdvertisingExpense",
            "MarketingExpense",
            "DepreciationAndAmortization",
            "DepreciationDepletionAndAmortization",
            "OtherSellingGeneralAndAdministrativeExpense",
            "Depreciation",
            "GoodwillImpairmentLoss",
            "GainLossOnSaleOfBusiness",
            "InterestIncomeExpenseNonoperatingNet",
            "NonoperatingIncomeExpense",
            "IncomeLossFromEquityMethodInvestments",
            "GainLossOnSaleOfEquityInvestments",
            "OtherNoninterestExpense",
            "RevenuesNetOfInterestExpense",
            "ExciseAndSalesTaxes",
            "OtherIncome",
            "NoninterestIncomeOther",
            "NoninterestIncome",
            "NoninterestExpense",
            "ExtraordinaryItemNetOfTax",
            "OtherPreferredStockDividendsAndAdjustments",
            "NoncontrollingInterestInNetIncomeLossOtherNoncontrollingInterestsNonredeemable",
            "NoncontrollingInterestInNetIncomeLossOtherNoncontrollingInterestsRedeemable",
            "InterestIncomeExpenseNet",
            "FuelCosts",
            "LaborAndRelatedExpense",
            "AirlineCapacityPurchaseArrangements",
            "AircraftMaintenanceMaterialsAndRepairs",
            "LandingFeesAndOtherRentals",
            "AircraftRental",
            "OtherCostAndExpenseOperating",
            "OtherExpenses",
            "DiscontinuedOperationGainLossOnDisposalOfDiscontinuedOperationNetOfTax",
            "DiscontinuedOperationIncomeLossFromDiscontinuedOperationDuringPhaseOutPeriodNetOfTax",
            "OtherNonoperatingExpense"
        ]

        retrieveTags(tagValues, years, Object.values(tags).reduce((acc, array) => acc.concat(array), []), parsedJSON)

        for (let i=0; i<years.length; i++) {
            const year = years[i]

            // Concept: Revenues
            let Revenues = map(tagValues, year, tags.Revenues)

            if (Revenues === undefined) { // Entity muts always have Revenues reported even if it's zero according to Charles Haffman CPA
                continue
            }

            correct = true

            let Revenue = fix(parsedFIX, "Revenue", year) || tagValues.NoninterestIncome[year] || Revenues

                // Determine if interest is included in revenue/cogs
                if (tagValues.RevenuesNetOfInterestExpense[year] !== undefined || tagValues.InterestIncomeOperating[year] !== undefined) {
                    //Revenue = Revenue - InterestIncome + InterestExpense
                    // JPM
                }

                // tags.InterestIncomeOperating[year] !== undefined pas sur que ca soit bon

            /*if (OtherOperatingIncomeExpenses === undefined && GrossProfit !== undefined && (OperatingExpenses !== undefined && OperatingIncomeLoss !== 0)) {
                OtherOperatingIncomeExpenses = OperatingIncomeLoss - (GrossProfit - OperatingExpenses)
            }*/ // Comes from Charles Hoffman CPA but doesn't work well because we want to include everything that's outside SG&A and R&D as Other Operating Expenses

            // Concept: OperatingIncomeLoss
            let OperatingIncomeLoss = map(tagValues, year, tags.OperatingIncomeLoss)

            // Concept: CostsAndExpenses
            let CostsAndExpenses = map(tagValues, year, tags.CostsAndExpenses)

            // Concept: SellingGeneralAndAdministrative (Ancien code)
            let SellingGeneralAndAdministrative 
            if (tagValues.SellingGeneralAndAdministrativeExpense[year] !== undefined) {
                SellingGeneralAndAdministrative = tagValues.SellingGeneralAndAdministrativeExpense[year]
            } else if (tagValues.GeneralAndAdministrativeExpense[year] !== undefined) {
                SellingGeneralAndAdministrative = (tagValues.SellingAndMarketingExpense[year] || tagValues.MarketingAndAdvertisingExpense[year] || tagValues.MarketingExpense[year] || 0) + (tagValues.GeneralAndAdministrativeExpense[year] || 0)
            } else {
                SellingGeneralAndAdministrative = (tagValues.LaborAndRelatedExpense[year] || 0) + (tagValues.OccupancyNet[year] || 0) + (tagValues.CommunicationsAndInformationTechnology[year] || 0) + (tagValues.ProfessionalAndContractServicesExpense[year] || 0) + (tagValues.SellingAndMarketingExpense[year] || tagValues.MarketingAndAdvertisingExpense[year] || tagValues.MarketingExpense[year] || 0) + (tagValues.DepreciationAndAmortization[year] || tagValues.DepreciationDepletionAndAmortization[year] || tagValues.Depreciation[year] || 0) + (tagValues.OtherSellingGeneralAndAdministrativeExpense[year] || 0)
                // JPM
            }

             // Concept: ResearchAndDevelopment
             let ResearchAndDevelopment = map(tagValues, year, tags.ResearchAndDevelopment)
            
             if (ResearchAndDevelopment === undefined && CostsAndExpenses !== undefined && OperatingIncomeLoss !== undefined && Revenues !== undefined && Revenues - CostsAndExpenses === OperatingIncomeLoss && tagValues.FuelCosts[year] === undefined) { // tagValues.FuelCosts[year] === undefined condition is a fix for AAL which has no R&D
                 ResearchAndDevelopment = CostsAndExpenses - (tagValues.CostOfRevenue[year] || 0) - (SellingGeneralAndAdministrative || 0) - (tagValues.GainLossOnSaleOfBusiness[year] || 0) - (tagValues.GoodwillImpairmentLoss[year] || 0) - (tagValues.FuelCosts[year] || 0) - (tagValues.AirlineCapacityPurchaseArrangements[year] || 0) - (tagValues.AircraftMaintenanceMaterialsAndRepairs[year] || 0) - (tagValues.LandingFeesAndOtherRentals[year] || 0) - (tagValues.AircraftRental[year] || 0) - (tagValues.OtherCostAndExpenseOperating[year] || 0)
             }

             if (fix(parsedFIX, "R&DincludedInSG&A", year)) {
                SellingGeneralAndAdministrative = (SellingGeneralAndAdministrative || 0) - (ResearchAndDevelopment || 0)
            }

            // Concept: Gross Profit
            let GrossProfit = fix(parsedFIX, "GrossProfit", year)
            GrossProfit = GrossProfit || map(tagValues, year, tags.GrossProfit)

            // Concept: IncomeLossFromContinuingOperationsBeforeTax
            let IncomeLossFromContinuingOperationsBeforeTax = map(tagValues, year, tags.IncomeLossFromContinuingOperationsBeforeTax)

            // Concept: Interest Income
            let InterestIncome = fix(parsedFIX, "InterestIncome", year) || map(tagValues, year, tags.InterestIncome)

            // Concept: Interest Expense
            let InterestExpense = fix(parsedFIX, "InterestExpense", year) || map(tagValues, year, tags.InterestExpense)

            // Concept: TotalOtherIncome
            let TotalOtherIncome

            if (OperatingIncomeLoss !== undefined && IncomeLossFromContinuingOperationsBeforeTax !== undefined) {
                TotalOtherIncome = IncomeLossFromContinuingOperationsBeforeTax - OperatingIncomeLoss
            //} //else if (OperatingExpenses !== undefined) { // Vieux code
                //TotalOtherIncome = OperatingExpenses - (Revenue - CostOfRevenue - (ProvisionForLoanLeaseAndOtherLosses || 0))
            } else if (GrossProfit !== undefined && IncomeLossFromContinuingOperationsBeforeTax !== undefined && OperatingIncomeLoss !== undefined) {
                TotalOtherIncome = IncomeLossFromContinuingOperationsBeforeTax - GrossProfit + (ResearchAndDevelopment || 0) + (SellingGeneralAndAdministrative || 0)
            } else {
                TotalOtherIncome = tagValues.NonoperatingIncomeExpense[year]
            }

            // Concept: InterestIncomeExpenseNet
            let InterestIncomeExpenseNet = tagValues.InterestIncomeExpenseNet[year] || tagValues.InterestIncomeExpenseNonoperatingNet[year]
            if (InterestIncomeExpenseNet === undefined) {
                InterestIncomeExpenseNet = (InterestIncome || 0) - (InterestExpense || 0)
            }

            // Concept: EquityIncomeInInvestee
            let EquityIncomeInInvestee = fix(parsedFIX, "EquityIncomeInInvestee", year)
            EquityIncomeInInvestee = EquityIncomeInInvestee || (tagValues.IncomeLossFromEquityMethodInvestments[year] || 0)

            // Concept: OtherIncome
            let OtherIncome = fix(parsedFIX, "OtherIncome", year)
            if (OtherIncome === undefined) {
                if (TotalOtherIncome !== undefined) {
                    OtherIncome = TotalOtherIncome - (InterestIncomeExpenseNet || 0 )
                } else {
                    OtherIncome = (tagValues.OtherIncome[year] || tagValues.NoninterestIncomeOther[year] || 0) - (tagValues.OtherExpenses[year] || 0) - (tagValues.OtherNonoperatingExpense[year] || 0)
                }
            }

            if (InterestIncome === undefined && InterestExpense !== undefined) {
                InterestIncome = InterestIncomeExpenseNet + InterestExpense
            }

            if (InterestExpense === undefined && InterestIncome !== undefined) {
                InterestExpense = InterestIncomeExpenseNet - InterestIncome
            }



            // Concept: OperatingExpenses
            let OperatingExpenses = map(tagValues, year, tags.OperatingExpenses)

            // Concept: CostOfRevenue
            let CostOfRevenue = fix(parsedFIX, "CostOfRevenue", year)
            
            if (CostOfRevenue === undefined) {
                CostOfRevenue = map(tagValues, year, tags.CostOfRevenue)
                if (CostOfRevenue === undefined && Revenues !== undefined && GrossProfit === undefined && (Revenues - CostsAndExpenses === OperatingIncomeLoss && OperatingExpenses === undefined && tags.OtherOperatingIncomeExpenses[year] === undefined)) {
                    CostOfRevenue = CostsAndExpenses - OperatingExpenses
                }

                if (CostOfRevenue === undefined && tagValues.Revenues[year] !== undefined && CostsAndExpenses !== undefined && IncomeLossFromContinuingOperationsBeforeTax !== undefined && (tagValues.Revenues[year] - CostsAndExpenses === IncomeLossFromContinuingOperationsBeforeTax || tagValues.Revenues[year] + (tagValues.OtherIncome[year] || 0) + (tagValues.IncomeLossFromEquityMethodInvestments[year] || 0) - CostsAndExpenses === IncomeLossFromContinuingOperationsBeforeTax)) {
                    CostOfRevenue = CostsAndExpenses - (tagValues.SellingGeneralAndAdministrativeExpense[year] || 0) - (tagValues.DepreciationDepletionAndAmortization[year] || 0) - (tagValues.ExplorationExpense[year] || 0) - (tagValues.NetPeriodicDefinedBenefitsExpenseReversalOfExpenseExcludingServiceCostComponent[year] || 0) - (tagValues.TaxesOther[year] || 0) - (tagValues.InterestExpense[year] || 0) - (tagValues.ExciseAndSalesTaxes[year] || 0)
                    // XOM
                }
            }

            let InterestExpenseAlreadyDeducted = false

            // Impute Operating Expenses based on existance of costs and expenses and cost of revenues (if it was not reported)
            if (OperatingExpenses === undefined && CostsAndExpenses !== undefined) {
                OperatingExpenses = CostsAndExpenses - (CostOfRevenue || 0)
            }

            if (OperatingExpenses === undefined) {
                OperatingExpenses = tagValues.NoninterestExpense[year] || tagValues.OtherNoninterestExpense[year]
                InterestExpenseAlreadyDeducted = true
                // JPM
            }
            
            if (OperatingExpenses === undefined && OperatingIncomeLoss !== undefined && GrossProfit !== undefined) {
                OperatingExpenses = GrossProfit - OperatingIncomeLoss
            }

            if (OperatingExpenses === undefined && GrossProfit !== undefined && IncomeLossFromContinuingOperationsBeforeTax !== undefined && OperatingIncomeLoss === undefined) {
                /*console.log("Year: " + year)
                console.log("GrossProfit: " + GrossProfit)
                console.log("IncomeLossFromContinuingOperationsBeforeTax: " + IncomeLossFromContinuingOperationsBeforeTax)
                console.log("InterestIncome: " + InterestIncome)
                console.log(" InterestExpense: " + InterestExpense)
                console.log("OtherIncome: " + OtherIncome)*/

                OperatingExpenses = GrossProfit - IncomeLossFromContinuingOperationsBeforeTax + (InterestIncome || 0) - (InterestExpense || 0) + (OtherIncome || 0)
            }

            if (OperatingExpenses === undefined && IncomeLossFromContinuingOperationsBeforeTax !== undefined && GrossProfit !== undefined) {
                OperatingExpenses = GrossProfit - IncomeLossFromContinuingOperationsBeforeTax - InterestExpense + OtherIncome
            }

            if (OperatingExpenses === undefined && Revenue !== undefined && CostOfRevenue !== undefined && OperatingIncomeLoss !== undefined) {
                OperatingExpenses = Revenue - OperatingIncomeLoss - CostOfRevenue
            }

            // Concept: OtherOperatingIncomeExpenses
            let OtherOperatingIncomeExpenses = fix(parsedFIX, "OtherOperatingIncomeExpenses", year)
            
            if (OtherOperatingIncomeExpenses === undefined && OperatingExpenses !== undefined) {
                OtherOperatingIncomeExpenses = -(OperatingExpenses - (SellingGeneralAndAdministrative || 0) - (ResearchAndDevelopment || 0))
                // NVDA
            } else if (OtherOperatingIncomeExpenses === undefined && Revenues - CostsAndExpenses === OperatingIncomeLoss) {
                OtherOperatingIncomeExpenses = -(Revenues - (CostOfRevenue || 0) - (SellingGeneralAndAdministrative || 0) - (ResearchAndDevelopment || 0))
                // MMM
            } else if (OtherOperatingIncomeExpenses === undefined) {
                OtherOperatingIncomeExpenses = -tagValues.OtherNoninterestExpense[year]
                // JPM
            }

            OtherOperatingIncomeExpenses = OtherOperatingIncomeExpenses || map(tagValues, year, tags.OtherOperatingIncomeExpenses)

            // Remove from OtherOperatingIncomeExpenses interest expense if included
            if (tagValues.OperatingIncomeLoss[year] === undefined && tagValues.RevenuesNetOfInterestExpense[year] === undefined && !InterestExpenseAlreadyDeducted) {
                OtherOperatingIncomeExpenses += InterestExpense
            }

            // Concept: ProvisionForLoanLeaseAndOtherLosses
            ProvisionForLoanLeaseAndOtherLosses = map(tagValues, year, tags.ProvisionForLoanLeaseAndOtherLosses)

            // Concept: IncomeTaxExpenseBenefit
            let IncomeTaxExpenseBenefit = fix(parsedFIX, "IncomeTaxExpenseBenefit", year)
            IncomeTaxExpenseBenefit = IncomeTaxExpenseBenefit || map(tagValues, year, tags.IncomeTaxExpenseBenefit)

            // Concept: IncomeFromDiscontinuedOperations
            let IncomeLossFromDiscontinuedOperationsNetOfTax = fix(parsedFIX, "IncomeLossFromDiscontinuedOperationsNetOfTax", year)
            IncomeLossFromDiscontinuedOperationsNetOfTax = IncomeLossFromDiscontinuedOperationsNetOfTax || map(tagValues, year, tags.IncomeLossFromDiscontinuedOperationsNetOfTax)
            IncomeLossFromDiscontinuedOperationsNetOfTax = IncomeLossFromDiscontinuedOperationsNetOfTax || ((tagValues.DiscontinuedOperationGainLossOnDisposalOfDiscontinuedOperationNetOfTax[year] || 0) + (tagValues.DiscontinuedOperationIncomeLossFromDiscontinuedOperationDuringPhaseOutPeriodNetOfTax[year] || 0))

            /*"IncomeLossFromDiscontinuedOperationsNetOfTax",
            "DiscontinuedOperationGainLossOnDisposalOfDiscontinuedOperationNetOfTax",
            "IncomeLossFromDiscontinuedOperationsNetOfTaxAttributableToReportingEntity"*/

            // Concept: NetIncomeLossAttributableToNoncontrollingInterest
            let NetIncomeLossAttributableToNoncontrollingInterest = fix(parsedFIX, "NetIncomeLossAttributableToNoncontrollingInterest", year)
            
            if (NetIncomeLossAttributableToNoncontrollingInterest === undefined) {
                NetIncomeLossAttributableToNoncontrollingInterest = map(tagValues, year, tags.NetIncomeLossAttributableToNoncontrollingInterest)
                NetIncomeLossAttributableToNoncontrollingInterest = (NetIncomeLossAttributableToNoncontrollingInterest + (tagValues.NoncontrollingInterestInNetIncomeLossOtherNoncontrollingInterestsNonredeemable[year] || 0))
            }

            // Concept: NetIncomeLoss
            let NetIncomeLoss = map(tagValues, year, tags.NetIncomeLoss)
            
            // Remove from Revenue EquityIncomeInInvestee and OtherIncome if it was already included in it

            if (Revenues - CostsAndExpenses === IncomeLossFromContinuingOperationsBeforeTax && IncomeLossFromContinuingOperationsBeforeTax - (IncomeTaxExpenseBenefit || 0) + (IncomeLossFromDiscontinuedOperationsNetOfTax || 0) - (NetIncomeLossAttributableToNoncontrollingInterest || 0) === NetIncomeLoss) {
                Revenue -= (EquityIncomeInInvestee || 0)
                // XOM
            }

            // Concept: ExtraordinaryItemNetOfTax
            let ExtraordinaryItemNetOfTax = (tagValues.ExtraordinaryItemNetOfTax[year] || 0) - (tagValues.OtherPreferredStockDividendsAndAdjustments[year] || 0)

            // Remove interest income if it was already included in Revenue
            if (((((Revenue || 0) - (CostOfRevenue || 0)) - ((SellingGeneralAndAdministrative || 0) + (ResearchAndDevelopment || 0) - (OtherOperatingIncomeExpenses || 0)) + (InterestIncomeExpenseNet || 0) + (OtherIncome || 0) - (ProvisionForLoanLeaseAndOtherLosses || 0))
            - (IncomeTaxExpenseBenefit || 0) + (IncomeLossFromDiscontinuedOperationsNetOfTax || 0) - (NetIncomeLossAttributableToNoncontrollingInterest || 0) + (EquityIncomeInInvestee || 0) + (ExtraordinaryItemNetOfTax || 0))
            
            - (InterestIncome || 0) === NetIncomeLoss) {
                Revenue -= (InterestIncome || 0)
            }

            // Remove interest income and other income if it was already included in Revenue (fix for XOM)
            if (((((Revenue || 0) - (CostOfRevenue || 0)) - ((SellingGeneralAndAdministrative || 0) + (ResearchAndDevelopment || 0) - (OtherOperatingIncomeExpenses || 0)) + (InterestIncomeExpenseNet || 0) + (OtherIncome || 0) - (ProvisionForLoanLeaseAndOtherLosses || 0))
            - (IncomeTaxExpenseBenefit || 0) + (IncomeLossFromDiscontinuedOperationsNetOfTax || 0) - (NetIncomeLossAttributableToNoncontrollingInterest || 0) + (EquityIncomeInInvestee || 0) + (ExtraordinaryItemNetOfTax || 0))
            
            - (InterestIncome || 0) - (OtherIncome || 0) === NetIncomeLoss) {
                Revenue -= (InterestIncome || 0) + (OtherIncome || 0)
            }
            
            // Remove other income if it was already included in Revenue (fix for JPM)
            if (((((Revenue || 0) - (CostOfRevenue || 0)) - ((SellingGeneralAndAdministrative || 0) + (ResearchAndDevelopment || 0) - (OtherOperatingIncomeExpenses || 0)) + (InterestIncomeExpenseNet || 0) + (OtherIncome || 0) - (ProvisionForLoanLeaseAndOtherLosses || 0))
            - (IncomeTaxExpenseBenefit || 0) + (IncomeLossFromDiscontinuedOperationsNetOfTax || 0) - (NetIncomeLossAttributableToNoncontrollingInterest || 0) + (EquityIncomeInInvestee || 0) + (ExtraordinaryItemNetOfTax || 0))
            
            - (OtherIncome || 0) === NetIncomeLoss) {
                Revenue -= (OtherIncome || 0)
            }

            // Invert sign of IncomeFromDiscontinuedOperations if necessary
            if (((((Revenue || 0) - (CostOfRevenue || 0)) - ((SellingGeneralAndAdministrative || 0) + (ResearchAndDevelopment || 0) - (OtherOperatingIncomeExpenses || 0)) + (InterestIncomeExpenseNet || 0) + (OtherIncome || 0) - (ProvisionForLoanLeaseAndOtherLosses || 0))
            - (IncomeTaxExpenseBenefit || 0) + (IncomeLossFromDiscontinuedOperationsNetOfTax || 0) - (NetIncomeLossAttributableToNoncontrollingInterest || 0) + (EquityIncomeInInvestee || 0) + (ExtraordinaryItemNetOfTax || 0))
            
            - (IncomeLossFromDiscontinuedOperationsNetOfTax || 0)*2 === NetIncomeLoss) {
                IncomeLossFromDiscontinuedOperationsNetOfTax -= IncomeLossFromDiscontinuedOperationsNetOfTax*2
            }

            // Invert sign of Noncontrolling interests if necessary
            if (((((Revenue || 0) - (CostOfRevenue || 0)) - ((SellingGeneralAndAdministrative || 0) + (ResearchAndDevelopment || 0) - (OtherOperatingIncomeExpenses || 0)) + (InterestIncomeExpenseNet || 0) + (OtherIncome || 0) - (ProvisionForLoanLeaseAndOtherLosses || 0))
            - (IncomeTaxExpenseBenefit || 0) + (IncomeLossFromDiscontinuedOperationsNetOfTax || 0) - (NetIncomeLossAttributableToNoncontrollingInterest || 0) + (EquityIncomeInInvestee || 0) + (ExtraordinaryItemNetOfTax || 0))
            
            + (NetIncomeLossAttributableToNoncontrollingInterest || 0)*2 === NetIncomeLoss) {
                IncomeLossFromDiscontinuedOperationsNetOfTax += NetIncomeLossAttributableToNoncontrollingInterest*2
            }

            // Remove Equity Income in Investee from Other Income if included in it
            if (((((Revenue || 0) - (CostOfRevenue || 0)) - ((SellingGeneralAndAdministrative || 0) + (ResearchAndDevelopment || 0) - (OtherOperatingIncomeExpenses || 0)) + (InterestIncomeExpenseNet || 0) + (OtherIncome || 0) - (ProvisionForLoanLeaseAndOtherLosses || 0))
            - (IncomeTaxExpenseBenefit || 0) + (IncomeLossFromDiscontinuedOperationsNetOfTax || 0) - (NetIncomeLossAttributableToNoncontrollingInterest || 0) + (EquityIncomeInInvestee || 0) + (ExtraordinaryItemNetOfTax || 0))
            
            - (EquityIncomeInInvestee || 0) === NetIncomeLoss) {
                OtherIncome -= (EquityIncomeInInvestee || 0)
            }

            Revenue = Revenue || 0
            CostOfRevenue = CostOfRevenue || 0
            ResearchAndDevelopment = ResearchAndDevelopment || 0
            SellingGeneralAndAdministrative = SellingGeneralAndAdministrative || 0
            OtherOperatingIncomeExpenses = OtherOperatingIncomeExpenses || 0
            InterestIncomeExpenseNet = InterestIncomeExpenseNet || 0
            OtherIncome = OtherIncome || 0
            IncomeTaxExpenseBenefit = IncomeTaxExpenseBenefit || 0
            IncomeLossFromDiscontinuedOperationsNetOfTax = IncomeLossFromDiscontinuedOperationsNetOfTax || 0
            NetIncomeLossAttributableToNoncontrollingInterest = NetIncomeLossAttributableToNoncontrollingInterest || 0
            EquityIncomeInInvestee = EquityIncomeInInvestee || 0
                
            incomeStatements[year] = {
                Revenue: Revenue,
                CostOfRevenue: CostOfRevenue,
                _GrossProfit: Revenue - CostOfRevenue,
                ResearchAndDevelopment: ResearchAndDevelopment,
                SellingGeneralAndAdministrative: SellingGeneralAndAdministrative,
                OtherOperatingIncomeExpenses: OtherOperatingIncomeExpenses,
                _OperatingExpenses: SellingGeneralAndAdministrative + ResearchAndDevelopment - OtherOperatingIncomeExpenses,
                _OperatingIncome: (Revenue - CostOfRevenue) - (SellingGeneralAndAdministrative + ResearchAndDevelopment - OtherOperatingIncomeExpenses),
                InterestIncome: InterestIncome,
                InterestExpense: InterestExpense,
                InterestIncomeExpenseNet: InterestIncomeExpenseNet,
                OtherIncome: OtherIncome,
                TotalOtherIncome: InterestIncomeExpenseNet + OtherIncome,
                ProvisionForLoanLeaseAndOtherLosses: ProvisionForLoanLeaseAndOtherLosses,
                _PretaxIncome: (Revenue - CostOfRevenue) - (SellingGeneralAndAdministrative + ResearchAndDevelopment - OtherOperatingIncomeExpenses) + InterestIncomeExpenseNet + OtherIncome - (ProvisionForLoanLeaseAndOtherLosses || 0),
                IncomeTaxExpenseBenefit: IncomeTaxExpenseBenefit,
                IncomeLossFromDiscontinuedOperationsNetOfTax: IncomeLossFromDiscontinuedOperationsNetOfTax,
                NetIncomeLossAttributableToNoncontrollingInterest: NetIncomeLossAttributableToNoncontrollingInterest,
                EquityIncomeInInvestee: EquityIncomeInInvestee,
                ExtraordinaryItemNetOfTax: ExtraordinaryItemNetOfTax,
                _NetIncomeLoss: ((Revenue - CostOfRevenue) - (SellingGeneralAndAdministrative + ResearchAndDevelopment - OtherOperatingIncomeExpenses) + InterestIncomeExpenseNet + OtherIncome - (ProvisionForLoanLeaseAndOtherLosses || 0))
                - IncomeTaxExpenseBenefit + IncomeLossFromDiscontinuedOperationsNetOfTax - NetIncomeLossAttributableToNoncontrollingInterest + EquityIncomeInInvestee + (ExtraordinaryItemNetOfTax || 0),
                NetIncomeLoss: NetIncomeLoss
            }

            if (incomeStatements[year].NetIncomeLoss !== incomeStatements[year]._NetIncomeLoss) {
                correct = false
                break
            }

            for (const key in incomeStatements[year]) {
                const value = incomeStatements[year][key]
                if (value === undefined || value === 0) continue

                while (value % maximumDivider === 0) {
                    maximumDivider = maximumDivider * 1000

                }

                while (value % minimumDivider !== 0) {
                    minimumDivider = minimumDivider / 1000
                    if (minimumDivider < 1) {
                        minimumDivider = 1
                        break
                    }
                }
            }
        }
    }

    dataObject.incomeStatements = incomeStatements

    return [Math.min(maximumDivider, minimumDivider), (incomeStatements.length === 0 ? undefined : correct)]
}

function removeLeadingZeros(inputString) {
    return inputString.replace(/^0+([1-9]\d*)/, '$1');
}

function numberToExcelColumn(columnNumber) {
    let header = "";
    while (columnNumber > 0) {
        let remainder = (columnNumber - 1) % 26; // Adjusting for 1-based indexing
        header = String.fromCharCode(65 + remainder) + header;
        columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return header;
}

app.get('/entities/:entity', async (req, res) => {
    res.append('Access-Control-Allow-Origin', '*')

    let CIK
    let TICKER

    let filename
    if (!isNaN(req.params.entity)) {
        CIK = removeLeadingZeros(req.params.entity)
        TICKER = CIKtoTickerMap[req.params.entity]?.toUpperCase()

        filename = "CIK" + padZeros(removeLeadingZeros(req.params.entity), 10) + ".json"
    } else {
        TICKER = req.params.entity.toUpperCase()
        const cik = tickerToCIKMap[req.params.entity.toLowerCase()]

        if (cik === undefined) {
            res.status(404).send('Entity not found');
            return
        }

        CIK = cik

        filename = "CIK" + padZeros(cik.toString(), 10) + ".json"
    }

    fs.readFile("companyfacts/" + filename, function(err,data){
        if (!err) {
            function execute(parsedFIX) {
                const parsedJSON = JSON.parse(data.toString())
                const responseData = {}
                responseData.cik = CIK
                responseData.ticker = TICKER

                retrieveEntityName(parsedJSON, parsedFIX, responseData)
                responseData.maximumDivider = Math.min(
                    retrieveIncomeStatements(parsedJSON, parsedFIX, [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009], responseData)[0],
                    retrieveCashFlowStatement(parsedJSON, parsedFIX, [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009], responseData),
                    retrieveBalanceSheet(parsedJSON, parsedFIX, [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009], responseData),
                    1000000000000
                )
                if (responseData.incomeStatements === undefined || responseData.incomeStatements?.length === 0) return

                const [fiscalYearEndDay, fiscalYearEndMonth] = retrieveFiscalYearEnd(parsedJSON)
                
                res.type('json')
                res.send(JSON.stringify(responseData, undefined, " "))
            }

            if (fs.existsSync("fixes/" + filename)) {
                fs.readFile("fixes/" + filename, function(err, data) {
                    if (!err) {
                        execute(JSON.parse(data))
                    } else {
                        execute({})
                        console.error(err);
                    }
                })
            } else {
                execute({})
            }
        } else {
            console.error(err);
        }
    });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})