// Import ethers.js
import { BrowserProvider, Contract, isAddress } from "ethers";

// --- Contract Details ---
const contractAddress = "The-Address-that-the-contract-has-been-deployed-upon";

const contractABI = "Paste-the-ABI-array-of-the-contract-after-deployment"; 

// --- DOM Elements ---
const metamaskStatus = document.getElementById('metamaskStatus');
const statusText = document.getElementById('statusText');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const userInfoDiv = document.getElementById('userInfo');
const accountAddressSpan = document.getElementById('accountAddress');
const isRegisteredSpan = document.getElementById('isRegistered');
const hasVotedSpan = document.getElementById('hasVoted');
const votedCandidateIdSpan = document.getElementById('votedCandidateId');
const electionStateSpan = document.getElementById('electionState');

const ownerPanel = document.getElementById('ownerPanel');
const voterAddressInput = document.getElementById('voterAddressInput');
const registerVoterBtn = document.getElementById('registerVoterBtn');
const candidateNameInput = document.getElementById('candidateNameInput');
const addCandidateBtn = document.getElementById('addCandidateBtn');
const startVotingBtn = document.getElementById('startVotingBtn');
const endVotingBtn = document.getElementById('endVotingBtn');

const candidatesUl = document.getElementById('candidatesUl');
const votingAreaDiv = document.getElementById('votingArea');
const voteButtonsDiv = document.getElementById('voteButtons');
const resultsAreaDiv = document.getElementById('resultsArea');
const resultsUl = document.getElementById('resultsUl');


// --- Ethers.js Variables ---
let provider;
let signer;
let contract;
let currentAccount = null;
let contractOwner = null; // To store the owner address from the contract

// --- Helper to get election state string ---
function getStateString(state) {
    console.log("State value received:", state, typeof state);
    switch (state) {
        case 0n: return "Registration";
        case 1n: return "Voting";
        case 2n: return "Finished";
        default: return "Unknown";
    }
}

// --- Connect Wallet ---
async function connectWallet() {
    if (window.ethereum) {
        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            handleAccountsChanged(accounts);

            // Initialize provider and signer
            provider = new BrowserProvider(window.ethereum); // Use BrowserProvider for Metamask
            signer = await provider.getSigner();

            // Initialize contract instance with signer (for sending transactions)
            contract = new Contract(contractAddress, contractABI, signer);

            // Get and store the contract owner address
            contractOwner = await contract.owner();
            console.log("Contract Owner:", contractOwner);

            // Set up listener for account changes
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            // Set up listener for network changes
            window.ethereum.on('chainChanged', handleChainChanged);

            // Initial UI update
            updateUI();

        } catch (error) {
            console.error("Error connecting wallet:", error);
            statusText.textContent = `Connection failed: ${error.message}`;
        }
    } else {
        statusText.textContent = "Metamask not detected. Please install Metamask.";
        connectWalletBtn.disabled = true; // Disable button if Metamask isn't there
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // Metamask is locked or the user did not authorize any accounts
        statusText.textContent = "Metamask is locked or no accounts selected.";
        userInfoDiv.style.display = 'none';
        currentAccount = null;
    } else if (accounts[0] !== currentAccount) {
        currentAccount = accounts[0];
        statusText.textContent = "Connected";
        accountAddressSpan.textContent = currentAccount;
        userInfoDiv.style.display = 'block';
        console.log("Account changed to:", currentAccount);

        // If contract is initialized, update UI based on new account
        if (contract) {
            updateUI();
        }
    }
}

function handleChainChanged(_chainId) {
  window.location.reload();
}


// --- Update UI ---
async function updateUI() {
    if (!contract || !currentAccount) {
        console.log("updateUI: Contract or account not ready.");
        return;
    }

    console.log("updateUI: Current Account:", currentAccount);
    console.log("updateUI: Contract Owner:", contractOwner);

    // Check if current user is owner and show owner panel
    if (currentAccount.toLowerCase() === contractOwner.toLowerCase()) {
        ownerPanel.style.display = 'block';
        console.log("updateUI: Showing owner panel.");
    } else {
        ownerPanel.style.display = 'none';
        console.log("updateUI: Hiding owner panel.");
    }

    let voterInfo = null; 

    // Update user info
    try {
        console.log("updateUI: Fetching voter info for", currentAccount);
        voterInfo = await contract.getVoter(currentAccount);
        console.log("updateUI: Fetched voterInfo:", voterInfo);

        isRegisteredSpan.textContent = voterInfo.isRegistered ? 'Yes' : 'No';
        hasVotedSpan.textContent = voterInfo.hasVoted ? 'Yes' : 'No';
        votedCandidateIdSpan.textContent = voterInfo.hasVoted ? voterInfo.votedCandidateId.toString() : 'N/A';

        console.log(`updateUI: Voter Status - Registered: ${voterInfo.isRegistered}, Voted: ${voterInfo.hasVoted}`);

    } catch (error) {
         console.error("updateUI: Error fetching voter info:", error);
         isRegisteredSpan.textContent = 'Error';
         hasVotedSpan.textContent = 'Error';
         votedCandidateIdSpan.textContent = 'Error';
    }


    // Update election state
    try {
        console.log("updateUI: Attempting to fetch current state...");
        const currentState = await contract.getCurrentState();
        console.log("updateUI: Fetched currentState:", currentState, typeof currentState);

        electionStateSpan.textContent = getStateString(currentState);
        console.log("updateUI: Updated election state display to:", electionStateSpan.textContent);


        // Show/hide areas based on state
        console.log("updateUI: Checking state for UI visibility...");
        votingAreaDiv.style.display = 'none';
        resultsAreaDiv.style.display = 'none';

        if (currentState === 1n) { // Voting state
             console.log("updateUI: State is Voting (1n). Checking voter status for voting area.");
             if (voterInfo && voterInfo.isRegistered && !voterInfo.hasVoted) { 
                 votingAreaDiv.style.display = 'block';
                 console.log("updateUI: Showing voting area.");
             } else {
                 console.log("updateUI: Hiding voting area - voterInfo not fetched, not registered, or already voted.");
             }
             resultsAreaDiv.style.display = 'none';
        } else if (currentState === 2n) { // Finished state
             console.log("updateUI: State is Finished (2n). Hiding voting area, showing results.");
             votingAreaDiv.style.display = 'none';
             resultsAreaDiv.style.display = 'block';
        } else { // Registration or Unknown
             console.log("updateUI: State is Registration (0n) or Unknown. Hiding voting/results areas.");
        }


    } catch (error) {
        console.error("updateUI: Error fetching election state or determining UI visibility:", error);
        electionStateSpan.textContent = "Error loading state.";
        votingAreaDiv.style.display = 'none';
        resultsAreaDiv.style.display = 'none';
    }


    // Update candidates list and voting buttons/results
    console.log("updateUI: Calling updateCandidatesAndResults...");
    await updateCandidatesAndResults();
}


async function updateCandidatesAndResults() {
    if (!contract) {
        console.log("updateCandidatesAndResults: Contract not ready.");
        return;
    }

    candidatesUl.innerHTML = ''; // Clear current list
    resultsUl.innerHTML = ''; // Clear current results list
    voteButtonsDiv.innerHTML = ''; // Clear current vote buttons
    console.log("updateCandidatesAndResults: Cleared lists.");

    let candidatesCount = 0n; 

    try {
        console.log("updateCandidatesAndResults: Fetching candidate count...");
        // Assign to the variable declared above
        candidatesCount = await contract.getCandidatesCount();
        console.log("updateCandidatesAndResults: Fetched candidatesCount:", candidatesCount, typeof candidatesCount);

    } catch (error) {
        console.error("updateCandidatesAndResults: Error fetching candidate count:", error); // <-- Log the error
        candidatesUl.innerHTML = '<li>Error loading candidates.</li>';
        resultsUl.innerHTML = '<li>Error loading results.</li>';
    }

    if (candidatesCount === 0n) { 
        candidatesUl.innerHTML = '<li>No candidates added yet.</li>';
        resultsUl.innerHTML = '<li>No candidates or results yet.</li>';
        console.log("updateCandidatesAndResults: No candidates found.");
    } else { 
        const candidatesData = []; 
        console.log(`updateCandidatesAndResults: Fetching ${candidatesCount} candidates and building lists...`);
        for (let i = 0n; i < candidatesCount; i++) { 
            console.log(`updateCandidatesAndResults: Processing candidate at index ${i}...`);

            let candidate = null; 

            try { 
                 candidate = await contract.getCandidate(i);
                 console.log(`updateCandidatesAndResults: Fetched candidate data for index ${i}:`, candidate);

                 // Store data
                 candidatesData.push({
                     id: candidate.id.toString(),
                     name: candidate.name,
                     voteCount: candidate.voteCount.toString()
                 });

                 // Add to candidates list 
                 const li = document.createElement('li');
                 li.textContent = `ID: ${candidate.id}, Name: ${candidate.name}`;
                 candidatesUl.appendChild(li);
                 console.log(`updateCandidatesAndResults: Appended to candidatesUl:`, li);

                 // Add vote button 
                 const currentState = await contract.getCurrentState();

                 const voterInfo = await contract.getVoter(currentAccount); 

                 console.log(`updateCandidatesAndResults: Checking conditions for vote button for candidate ${candidate.id} (${candidate.name}). State: ${currentState}, Registered: ${voterInfo ? voterInfo.isRegistered : 'N/A'}, Voted: ${voterInfo ? voterInfo.hasVoted : 'N/A'}`);

                 if (currentState === 1n && voterInfo && voterInfo.isRegistered && !voterInfo.hasVoted) {
                     const voteBtn = document.createElement('button');
                     voteBtn.textContent = `Vote for ${candidate.name}`;
                     voteBtn.onclick = () => handleVote(candidate.id);
                     voteButtonsDiv.appendChild(voteBtn);
                     console.log(`updateCandidatesAndResults: Added vote button for candidate ${candidate.id}.`);
                 }

                  if (candidate) {
                      const resultLi = document.createElement('li');
                      resultLi.textContent = `${candidate.name}: ${candidate.voteCount.toString()} votes`;
                      resultsUl.appendChild(resultLi);
                      console.log(`updateCandidatesAndResults: Appended to resultsUl:`, resultLi);
                  } else {
                      console.warn(`updateCandidatesAndResults: Skipping resultsUl append for index ${i} due to missing candidate data.`);
                  }


            } catch (innerError) {
                 console.error(`updateCandidatesAndResults: Error processing candidate at index ${i}:`, innerError);
                 const errorLi = document.createElement('li');
                 errorLi.textContent = `Error loading candidate at index ${i}.`;
                 resultsUl.appendChild(errorLi);
                 candidatesUl.appendChild(errorLi.cloneNode(true)); 
            }
        }
    } 

    try { 
        const currentState = await contract.getCurrentState(); 
        console.log(`updateCandidatesAndResults: Final state check for results area: ${currentState === 2n}. Current state fetched: ${currentState}`);
        if (currentState === 2n) {
            resultsAreaDiv.style.display = 'block';
             console.log("updateCandidatesAndResults: Showing results area.");
        } else {
            resultsAreaDiv.style.display = 'none';
             console.log("updateCandidatesAndResults: Hiding results area.");
        }
    } catch (stateError) {
        console.error("updateCandidatesAndResults: Error checking final state for results area:", stateError);
        
        resultsAreaDiv.style.display = 'none';
    }
}

// --- Transaction Handlers ---

async function handleRegisterVoter() {
    if (!contract || !signer) return;
    const voterAddress = voterAddressInput.value.trim();
    if (!voterAddress) {
        alert("Please enter a voter address.");
        return;
    }
     if (!isAddress(voterAddress)) { 
         alert("Please enter a valid Ethereum address.");
         return;
     }

    try {
        // Send the transaction
        const tx = await contract.registerVoter(voterAddress);
        console.log("Register Voter Tx sent:", tx.hash);
        alert(`Registering voter ${voterAddress}. Transaction sent: ${tx.hash}`);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Register Voter Tx confirmed:", receipt);
        alert("Voter registered successfully!");

        // Update UI after transaction is confirmed
        updateUI();

    } catch (error) {
        console.error("Error registering voter:", error);
        alert(`Error registering voter: ${error.message}`);
    }
}

async function handleAddCandidate() {
    if (!contract || !signer) return;
    const candidateName = candidateNameInput.value.trim();
    if (!candidateName) {
        alert("Please enter a candidate name.");
        return;
    }

    try {
        const tx = await contract.addCandidate(candidateName);
        console.log("Add Candidate Tx sent:", tx.hash);
        alert(`Adding candidate "${candidateName}". Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log("Add Candidate Tx confirmed:", receipt);
        alert("Candidate added successfully!");
        candidateNameInput.value = ''; // Clear input
        updateUI();
    } catch (error) {
        console.error("Error adding candidate:", error);
        alert(`Error adding candidate: ${error.message}`);
    }
}

async function handleStartVoting() {
     if (!contract || !signer) return;
     try {
         const tx = await contract.startVoting();
         console.log("Start Voting Tx sent:", tx.hash);
         alert(`Starting voting. Transaction sent: ${tx.hash}`);
         const receipt = await tx.wait();
         console.log("Start Voting Tx confirmed:", receipt);
         alert("Voting started!");
         updateUI();
     } catch (error) {
         console.error("Error starting voting:", error);
         alert(`Error starting voting: ${error.message}`);
     }
}

async function handleEndVoting() {
    if (!contract || !signer) return;
     try {
         const tx = await contract.endVoting();
         console.log("End Voting Tx sent:", tx.hash);
         alert(`Ending voting. Transaction sent: ${tx.hash}`);
         const receipt = await tx.wait();
         console.log("End Voting Tx confirmed:", receipt);
         alert("Voting ended!");
         updateUI();
     } catch (error) {
         console.error("Error ending voting:", error);
         alert(`Error ending voting: ${error.message}`);
     }
}


async function handleVote(candidateId) {
     if (!contract || !signer) return;

     // Double check voter status before sending tx
     try {
         const voterInfo = await contract.getVoter(currentAccount);
         if (!voterInfo.isRegistered) {
             alert("You are not registered to vote.");
             updateUI(); // Update UI in case local state is wrong
             return;
         }
         if (voterInfo.hasVoted) {
             alert("You have already voted.");
              updateUI(); // Update UI
             return;
         }
     } catch (error) {
         console.error("Error checking voter status before voting:", error);
         alert("Could not verify voter status. Please try again.");
         return;
     }


     try {
         const tx = await contract.vote(candidateId);
         console.log(`Vote for candidate ${candidateId} Tx sent:`, tx.hash);
         alert(`Voting for candidate ${candidateId}. Transaction sent: ${tx.hash}`);
         const receipt = await tx.wait();
         console.log("Vote Tx confirmed:", receipt);
         alert("Vote cast successfully!");

         // Update UI after transaction is confirmed
         updateUI();

     } catch (error) {
         console.error("Error voting:", error);
         alert(`Error casting vote: ${error.message}`);
     }
}


// --- Event Listeners ---
connectWalletBtn.addEventListener('click', connectWallet);
registerVoterBtn.addEventListener('click', handleRegisterVoter);
addCandidateBtn.addEventListener('click', handleAddCandidate);
startVotingBtn.addEventListener('click', handleStartVoting);
endVotingBtn.addEventListener('click', handleEndVoting);


// --- Initial Check on page load ---
// Check if Metamask is already connected
if (window.ethereum && window.ethereum.selectedAddress) {
     // If Metamask is already connected and an account is selected
     connectWallet(); // Run the connection logic
} else {
    statusText.textContent = "Metamask not connected.";
    // The connectWalletBtn is visible by default, user needs to click it.
}
