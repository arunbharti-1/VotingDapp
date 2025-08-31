// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Voting {
    address public owner;

    enum State { Registration, Voting, Finished }
    State public currentState;

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedCandidateId;
    }

    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    // Mapping of voter addresses to Voter structs
    mapping(address => Voter) public voters;

    // Array of candidates
    Candidate[] public candidates;

    // Candidate counter to assign unique IDs
    uint public nextCandidateId;

    event VoterRegistered(address voterAddress);
    event CandidateAdded(uint candidateId, string name);
    event ElectionStateChanged(State newState);
    event Voted(address voterAddress, uint candidateId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action.");
        _;
    }

    modifier inState(State _state) {
        require(currentState == _state, "Action not allowed in current state.");
        _;
    }

    constructor() {
        owner = msg.sender;
        currentState = State.Registration;
    }

    // --- Owner Actions ---

    function registerVoter(address _voter) public onlyOwner inState(State.Registration) {
        require(!voters[_voter].isRegistered, "Voter is already registered.");
        voters[_voter].isRegistered = true;
        emit VoterRegistered(_voter);
    }

    function addCandidate(string memory _name) public onlyOwner inState(State.Registration) {
        // Basic validation
        require(bytes(_name).length > 0, "Candidate name cannot be empty.");

        candidates.push(Candidate(nextCandidateId, _name, 0));
        emit CandidateAdded(nextCandidateId, _name);
        nextCandidateId++; // Increment ID for the next candidate
    }

    function startVoting() public onlyOwner inState(State.Registration) {
        // Ensure there are candidates to vote for
        require(candidates.length > 0, "Cannot start voting without candidates.");
        currentState = State.Voting;
        emit ElectionStateChanged(State.Voting);
    }

    function endVoting() public onlyOwner inState(State.Voting) {
        currentState = State.Finished;
        emit ElectionStateChanged(State.Finished);
    }

    // --- Voter Actions ---

    function vote(uint _candidateId) public inState(State.Voting) {
        // Check if voter is registered
        require(voters[msg.sender].isRegistered, "You are not registered to vote.");
        // Check if voter has already voted
        require(!voters[msg.sender].hasVoted, "You have already voted.");
        // Check if candidate ID is valid (within bounds of the candidates array)
         require(_candidateId < candidates.length, "Invalid candidate ID.");

        // Find the correct candidate by its stored ID
        uint candidateIndex;
        bool found = false;
        for(uint i = 0; i < candidates.length; i++) {
            if(candidates[i].id == _candidateId) {
                candidateIndex = i;
                found = true;
                break;
            }
        }
        require(found, "Invalid candidate ID.");


        // Record the vote
        candidates[candidateIndex].voteCount++;

        // Mark voter as having voted
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedCandidateId = _candidateId;

        emit Voted(msg.sender, _candidateId);
    }

    // --- View Functions ---

    // Get candidate details by index (for fetching all candidates)
    function getCandidate(uint _index) public view returns (uint id, string memory name, uint voteCount) {
        require(_index < candidates.length, "Invalid candidate index.");
        Candidate storage c = candidates[_index];
        return (c.id, c.name, c.voteCount);
    }

    // Get total number of candidates
    function getCandidatesCount() public view returns (uint) {
        return candidates.length;
    }

    // Get voter details by address
    function getVoter(address _voter) public view returns (bool isRegistered, bool hasVoted, uint votedCandidateId) {
        Voter storage v = voters[_voter];
        return (v.isRegistered, v.hasVoted, v.votedCandidateId);
    }

    // Get the current state of the election
    function getCurrentState() public view returns (State) {
        return currentState;
    }
}
