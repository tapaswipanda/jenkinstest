<?php
Class ClientBal {

	/*
	return timestamp of the date client added in oour system
	*/
	function getClientAddDate($clientId) {
		
		$addedDate = 0;
		
		if($clientId > 0) {
		
			$sqlGetClientAddDate = "SELECT creationDate FROM person WHERE id = '$clientId'";
			
			$resGetClientAddDate = DB::do_query($sqlGetClientAddDate);
			
			$rowGetClientAddDate = DB::db_fetch_assoc($resGetClientAddDate);
			
			$addedDate = explode(' ', $rowGetClientAddDate['creationDate']);
			$addedDate = strtotime($addedDate[0]);
		}
		
		return $addedDate;
	}
	
	/*
	Now its taking default date as client added date in our system
	*/
	function getDefaultStartDate($clientId) {
		
		return $this->getClientAddDate($clientId);
	}	

	/*Returning the remaining start up balance for a client till a perticular date */
	function getClientStartUpBal($clientId) {
	
		$startUpBal = 0;
		$startUpBalAlloc = 0;
		
		if($clientId > 0) {
		
			//getting the startup balance for client while client added in our system
			$sqlGetStartUpBal = "SELECT startupBalance FROM person WHERE id='$clientId'";
			$resGetStartUpBal = DB::do_query($sqlGetStartUpBal);
			
			if($resGetStartUpBal) {
				
				$rowGetStartUpBal = DB :: db_fetch_array($resGetStartUpBal);
				
				$startUpBal = $rowGetStartUpBal['startupBalance'];
				
				//getting allocation done for this client towards start up balance
				$sqlStartBal = "SELECT csb.amt_paid
							FROM clientstartupbalallocation AS csb
							WHERE csb.client_id = $clientId
							AND is_erased = 0
							ORDER BY csb.id ASC";
							
				$resStartBal = DB::do_query($sqlStartBal);
				
				if($resStartBal && (DB::db_fetch_num_rows($resStartBal) > 0)) {			
					
					While($rowStartBal = DB :: db_fetch_array($resStartBal)) {
					
						$startUpBalAlloc += $rowStartBal['amt_paid'];
					}
				}
				
				$startUpBal -= $startUpBalAlloc;
			}
		}
		
		return $startUpBal;
	}
	
	
	/*
	Returning adjustment done for client for a given date range, 
	if no date range given end date is a current date and start date is the default date according to our logic(getDefaultStartDate function)
	Data not included the end date
	*/
	function getClientAdj($clientId, $startDate = '', $endDate = '') {
	
		$clientAdj = 0;
		
		if($clientId > 0) {
			
			$fromDate = $startDate;
			$toDate = $endDate;
			
			$sqlGetAdj = "SELECT SUM(amount) AS adjAmt
						FROM clientadjustment
						WHERE client_id = '$clientId'
						AND status = 1";
								
			if($fromDate != '') {
				$sqlGetAdj .= " AND added_date >= '$fromDate 00:00:00' ";
			}
			if($toDate != '') {
				$sqlGetAdj .= " AND added_date < '$toDate'";
			}
			
			$resGetAdj = DB::do_query($sqlGetAdj);
			
			if(DB::db_fetch_num_rows($resGetAdj) > 0) {
			
				$rowGetAdj = DB::db_fetch_assoc($resGetAdj);
				$clientAdj = $rowGetAdj['adjAmt'];
			}
		}
		
		return $clientAdj;
	}
	

	/*
	Returning the unallocated client payment for a specific client in a given date range
	if no date range given end date is a current date and start date is the default date according to our logic(getDefaultStartDate function)
	*/
	function getClientUnAllocatePay($clientId, $startDate = '', $endDate = '', $payerId = '0') {
	
		$clientUnAllocPay = 0;
		
		if($clientId > 0) {
		
			$fromDate = $startDate;
			$toDate = $endDate;			
			
			$sqlGetPay = "SELECT SUM(totalAmountRem) AS amtRem
						FROM clientpayment
						WHERE clientID = '$clientId'
						AND isDeleted = 0";
			if($payerId != '0' && $payerId != '') {
				$sqlGetPay .= " AND clientcontact_id = '$payerId' ";
			}
			if($fromDate != '') {
				$sqlGetPay .= " AND paymentDate >= '$fromDate' ";
			}

			if($toDate != '') {
				$sqlGetPay .= " AND paymentDate <= '$toDate'";
			}

			
			$resGetPay= DB::do_query($sqlGetPay);
			
			if(DB::db_fetch_num_rows($resGetPay) > 0) {
			
				$rowGetPay = DB::db_fetch_assoc($resGetPay);
				$clientUnAllocPay = $rowGetPay['amtRem'];
			}
		}
		return $clientUnAllocPay;
	}

	/*
	Returning the client bal for a specific client for a date range
	if no date range given end date is a current date and start date is the default date according to our logic(getDefaultStartDate function)
	@ $runSesId : It is used for fetch ing the single session running balance 
	@ $incStratup: 1 will not show; 0 will show
	*/	
	function getClientBal($clientId, $providerId, $startDate = '', $endDate = '', $runSesId = '', $incStratup='0', $payerId='') {

		$clientBalInfo = array();
		$isShowNA = 1;
		try {
		
			if($clientId > 0) {
				
				$fromDate = $startDate;
				$toDate = $endDate;
				
				$clientBal = 0;
				$estimationCopay =  $procCopayArray = $clientBalCalMethod = array();

				$balMethod = new GetBalMethod();
			
				$sqlGetSes = "SELECT cs.id, cs.sessionDate, cs.fee, cs.adj_fee, cs.other_ins_adj, cs.amt_paid, cs.out_of_network_ins_type,
						cs.procedureID, cs.pending_personinsurance_id, pp.code
						FROM clientsession AS cs 
						LEFT JOIN providerprocedure AS pp ON cs.procedureID = pp.id
						WHERE cs.clientID = '$clientId'
						AND cs.sessionStatus = 1";
				if($runSesId != '') {
					$sqlGetSes .= " AND cs.id='$runSesId'";
				}
				if($payerId != '' && $payerId != '0') {
					$sqlGetSes .= " AND cs.clientcontact_id= '$payerId'";	
				}
				if($fromDate != '') {
					$sqlGetSes .= " AND cs.sessionDate >= '$fromDate' ";
				}
				if($toDate != '') {
					$sqlGetSes .= " AND cs.sessionDate <= '$toDate'";
				}

				$sqlGetSes .= " order by  sessionDate";	
				$i = 0;
				
				$resGetSes = DB::do_query($sqlGetSes);
				
				if(DB::db_fetch_num_rows($resGetSes)) {
				
					while($rowGetSes = DB :: db_fetch_array($resGetSes )) {

						$i++;
						$sesId = $rowGetSes['id'];
						$sesDate = $rowGetSes['sessionDate'];
						$sesProc = $rowGetSes['code'];
						$sesFee = $rowGetSes['fee'];
						$sesAdjFee = $rowGetSes['adj_fee'];
						$sesOthInsAdj = $rowGetSes['other_ins_adj'];
						$sesInsPay = $rowGetSes['amt_paid'];
						$pendingInsId = $rowGetSes['pending_personinsurance_id'];
						$ONNType = $rowGetSes['out_of_network_ins_type'];
						
						//getting the client payment done for each session
						$sqlCPay = "SELECT SUM(cpa.amt_paid) AS client_amt_paid, SUM(cpa.amt_write_off) AS amt_write_off 
									FROM clientpaymentallocation AS cpa
									WHERE cpa.session_id = '$sesId'
									AND cpa.is_erased = 0 
									GROUP BY cpa.session_id";
						
						$resCPay = DB::do_query($sqlCPay);
						
						$clientPayArray = array();		
						$j = 0;
						$sesCPay  = 0;
						$sesCAmtWrtOff  = 0;
						
						//if client has payments allocated to its sessions
						if(DB::db_fetch_num_rows($resCPay)){
							
							$rowCPay = DB::db_fetch_assoc($resCPay);
							$sesCPay =  $rowCPay['client_amt_paid'];
							$sesCAmtWrtOff =  $rowCPay['amt_write_off'];
						}
						
						$sesBal = 0;
						
						//if pending to client or Out of network type insurance, then we need to assign the full remaining amount to client
						if($pendingInsId == 0 || $ONNType) {
							$sesBal = $sesAdjFee - ($sesOthInsAdj + $sesInsPay + $sesCPay + $sesCAmtWrtOff);
							$isShowNA = 0;
						} else {
							
							$clientBalCalMethod = $balMethod->checkClientBalCalcMethodToUse(strtotime($sesDate), $clientId, $providerId, $sesProc);
							$coPayAmt = 0;
							if(count($clientBalCalMethod) && $clientBalCalMethod['method'] == 2) {

								if(array_key_exists($sesProc, $clientBalCalMethod['copay'])) {
									$coPayAmt = $clientBalCalMethod['copay'][$sesProc];
								} else {
									$coPayAmt = $balMethod->getFirstCopayUcrAmount($clientBalCalMethod['balCustId'], $sesProc, 1);
								}
								
								$estimationCopay[$sesProc] = $sesFee;
								if($coPayAmt >= $sesFee) {
									$coPayAmt =  $sesFee;	
								}
								$sesBal = $coPayAmt - ($sesCPay + $sesCAmtWrtOff);
								$isShowNA = 0;
								
							} else {
								
								$isShowNA *= 1;
							}
						}
						$clientBal += $sesBal;
					}
				}
			}
	
			// getting the start up bal and adding it to client bal
			if($runSesId == '') {

				$startUpBal = 0;
				//@$incStratup = 0 we need to add startup balance @$incStratup=1 not to add startup
				if($incStratup == '0') {
					$startUpBal = $this->getClientStartUpBal($clientId);	
				}				

				$clientBal += $startUpBal;
				$clientAdjFee = $this->getClientAdj($clientId, $fromDate, $toDate, 0);
				
				$clientUnAllocatedPayment = $this->getClientUnAllocatePay($clientId, $fromDate, $toDate, $payerId);

				// adding client adjustment and substrcting the unallocated client payment
				$clientBal += $clientAdjFee - $clientUnAllocatedPayment;
				if($isShowNA == 1) {
					if($startUpBal > 0 || $clientAdjFee > 0 || $clientUnAllocatedPayment > 0 || $clientBal > 0) {
						$isShowNA = 0;
					}
				}
				
			}
			
			$finePrintText = '';
			$estimatedFlag = 0;

			if(count($estimationCopay)) {
				
				$finePrintText = "* Based on an estimated copay of ";
				$count = 0;
				
				foreach($estimationCopay as $key=>$val) {
					
					if($count) {
						$finePrintText .= ' and ';
					}
					$finePrintText .= '$'.number_format($val, 2)." for $key";
					$count++;
				}
				$estimatedFlag = 1;
			}	
			
			$clientBalInfo[] = round($clientBal, 2);
			$clientBalInfo[] = $finePrintText;
			$clientBalInfo[] = $estimatedFlag;
			$clientBalInfo[] = $isShowNA ;
		
		}catch(Exception $e) {
			APP::logErrors($e);
		}
		
		return $clientBalInfo;
	}
	

	function displayCltBalance($clientId, $providerId, $startDate = '', $endDate = '', $runSesId = '') {

		$cltBalToShow = '';
		$cltBalArr = $this->getClientBal($clientId, $providerId, $startDate, $endDate, $runSesId);

		$cltBalToShow = ($cltBalArr['2']==1)?'<span class="red">*</span>':'';
		$cltBalToShow  .= getCurrencyAmount($cltBalArr[0], 1);

		if($cltBalArr['3'] == '1') {
			$cltBalToShow = 'N/A';
		}
		return $cltBalToShow;
	}
	
	/*
		Returning the client bal for a specific client for a date range
		if no date range given end date is a current date and start date is the default date according to our logic(getDefaultStartDate function)
	*/

	function fetchRunningClientBal($providerId, $clientId, $sesId) {

		if($providerId != '' && $clientId != '' && $sesId != '') {

			//here we are using the  to get the client Balanace method to get cliet balance
			$clientBalArr = $this->getClientBal($clientId, $providerId, '', '', $sesId);
			
		}

		return $clientBalArr;
	}


	/*
	Return an array of 2 elements
	1 : Copay Amount
	2: Copay seted place(0: set from custoizaion tool, 1 from Insurance)
	*/
	function getSesCopay($sesId) {
		
		$sesCopayAmt = array("amount"=>0, "place"=>0);
		try {
		
			if($sesId > 0) {
			
				$sqlGetSes = "SELECT cs.clientID, cs.providerID, cs.sessionDate, cs.fee, cs.adj_fee, 
							cs.other_ins_adj, cs.amt_paid, cs.out_of_network_ins_type, cs.client_copay,
							cs.procedureID, cs.pending_personinsurance_id, pp.code
							FROM clientsession AS cs 
							LEFT JOIN providerprocedure AS pp ON cs.procedureID = pp.id
							WHERE cs.id = '$sesId'
							AND cs.sessionStatus = 1";
							
				$resGetSes = DB::do_query($sqlGetSes);
				
				if(DB::db_fetch_num_rows($resGetSes) > 0) {
				
					$rowGetSes = DB::db_fetch_assoc($resGetSes);
					
					$clientId = $rowGetSes['clientID'];
					$providerId = $rowGetSes['providerID'];
					
					$sesDate = $rowGetSes['sessionDate'];
					$sesProc = $rowGetSes['code'];
					$sesFee = $rowGetSes['fee'];
					$sesAdjFee = $rowGetSes['adj_fee'];
					$sesOthInsAdj = $rowGetSes['other_ins_adj'];
					$sesInsPay = $rowGetSes['amt_paid'];
					$sesInsCopay = $rowGetSes['client_copay'];
					$pendingInsId = $rowGetSes['pending_personinsurance_id'];
					$ONNType = $rowGetSes['out_of_network_ins_type'];
					
					if($ONNType == 1) {
						$sesCopayAmt['amount'] = 0;
						$sesCopayAmt['place'] = 0;
					}else if($pendingInsId == 0){
						$sesCopayAmt['amount'] = 0;
						$sesCopayAmt['place'] = 0;		
					}else {
					
						if($sesInsCopay > 0) { // if copay set by insurance, we have to this as priority
						
							$sesCopayAmt["amount"] = $sesInsCopay;
							$sesCopayAmt["place"] = 1;
						}else {
							
							$balMethod  = new GetBalMethod();
							$clientBalCalMethod = array();
							$clientBalCalMethod = $balMethod->checkClientBalCalcMethodToUse(strtotime($sesDate), $clientId, $providerId, $sesProc);

							if(count($clientBalCalMethod) && $clientBalCalMethod['method'] == 2) {
								
								if(array_key_exists($sesProc, $clientBalCalMethod['copay'])) {
									$sesCopayAmt['amount'] = $clientBalCalMethod['copay'][$sesProc];
								} else {
									$sesCopayAmt['amount'] = $balMethod->getFirstCopayUcrAmount($clientBalCalMethod['balCustId'], $sesProc, 1);
								}
								$sesCopayAmt['place'] = 0;
							}
						}
					}
				}
			}
		
		}catch(Exception $e) {
			APP::logErrors($e);
		}
		
		return $sesCopayAmt;
	}


	
}
